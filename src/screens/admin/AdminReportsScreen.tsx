import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { ScoreCard } from '../../components/ScoreCard';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { attendanceService } from '../../services/attendanceService';
import {
  getTodayDateStringIST,
  getWeekDetails,
  formatMinutesToHours,
  calculateSleepDurationMinutes,
  getMonthCalendarWeeks,
  CalendarWeek,
  MONTH_NAMES_SHORT,
} from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';
import { UserProfile } from '../../types/auth';
import { WeeklyReport, MonthlyReport } from '../../types/report';

interface DevoteeWeekSummary {
  user: UserProfile;
  submittedCount: number;
  totalScore: number;
  avgPercentage: number;
  dayMap: { [dateStr: string]: SadhanaEntry | undefined };
}

export const AdminReportsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();

  // Active Top Tab: Daily | Weekly | Monthly | Download
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'download'>('daily');

  // Search box state (filters all 3 tabs in real-time)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Common Loading / Refreshing
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DAILY TAB STATE
  // -------------------------------------------------------------
  const [dailyViewMode, setDailyViewMode] = useState<'week' | 'single'>('week');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(todayStr);
  const [dailyFilterMode, setDailyFilterMode] = useState<'all' | 'lowScore'>('all');
  const [singleDayEntries, setSingleDayEntries] = useState<SadhanaEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<SadhanaEntry[]>([]);
  const [allCounselees, setAllCounselees] = useState<UserProfile[]>([]);
  const [expandedDevoteeId, setExpandedDevoteeId] = useState<string | null>(null);

  const formatFriendlyTime = (t24?: string) => {
    if (!t24 || !t24.includes(':')) return t24 || 'N/A';
    const [hStr, mStr] = t24.split(':');
    let h = parseInt(hStr, 10);
    const m = (mStr || '00').padStart(2, '0');
    if (isNaN(h)) return t24;
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m} ${period}`;
  };

  // Helper for past 7 days with offset support
  const [dailyWeekOffset, setDailyWeekOffset] = useState<number>(0);
  const getPast7Days = (offset = 0) => {
    const list: { dateStr: string; label: string; dayName: string; dateNum: string }[] = [];
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayName = (offset === 0 && i === 0) ? 'Today' : (offset === 0 && i === 1) ? 'Yesterday' : dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      const dateNum = String(d.getDate());
      list.push({ dateStr, label, dayName, dateNum });
    }
    return list;
  };

  const past7Days = getPast7Days(dailyWeekOffset);
  const weekStartDate = past7Days[6].dateStr;
  const weekEndDate = past7Days[0].dateStr;

  // -------------------------------------------------------------
  // WEEKLY TAB STATE
  // -------------------------------------------------------------
  const { weekId: currentWeekId, startDate: currentWeekStart, endDate: currentWeekEnd } = getWeekDetails(todayStr);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [weeklyFilterMode, setWeeklyFilterMode] = useState<'all' | 'lowScore'>('all');
  const [expandedWeeklyUserId, setExpandedWeeklyUserId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // MONTHLY TAB STATE
  // -------------------------------------------------------------
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [monthlyFilterMode, setMonthlyFilterMode] = useState<'all' | 'lowScore'>('all');

  // -------------------------------------------------------------
  // DOWNLOAD PROGRESS TAB STATE (Item 6)
  // -------------------------------------------------------------
  const [downloadSelectedDevotee, setDownloadSelectedDevotee] = useState<UserProfile | null>(null);
  const [downloadSubTab, setDownloadSubTab] = useState<'week' | 'month'>('week');
  const [downloadMonthWeeks, setDownloadMonthWeeks] = useState<CalendarWeek[]>([]);
  const [downloadSelectedWeekIndex, setDownloadSelectedWeekIndex] = useState<number>(1);
  const [downloadDevoteeEntries, setDownloadDevoteeEntries] = useState<SadhanaEntry[]>([]);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Load data when tab changes or parameters change
  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyData();
    } else if (activeTab === 'weekly') {
      loadWeeklyData();
    } else if (activeTab === 'monthly') {
      loadMonthlyData();
    } else if (activeTab === 'download') {
      loadDownloadData();
    }
  }, [activeTab, dailyViewMode, selectedDailyDate, dailyWeekOffset, selectedYear, selectedMonth]);

  useEffect(() => {
    const weeks = getMonthCalendarWeeks(selectedYear, selectedMonth, todayStr);
    setDownloadMonthWeeks(weeks);
    const curr = weeks.find((w) => w.isCurrentWeek);
    if (curr) {
      setDownloadSelectedWeekIndex(curr.weekIndex);
    } else {
      setDownloadSelectedWeekIndex(1);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (downloadSelectedDevotee) {
      loadDownloadDevoteeEntries(downloadSelectedDevotee.uid);
    }
  }, [downloadSelectedDevotee, selectedYear, selectedMonth]);

  const loadDownloadData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const devotees = await authService.getAllCounselees(forceRefresh);
      const approved = devotees
        .filter((u) => u.status === 'approved' && u.role !== 'counsellor')
        .sort((a, b) => (a.displayName || 'Devotee').localeCompare(b.displayName || 'Devotee'));
      setAllCounselees(approved);
      if (!downloadSelectedDevotee && approved.length > 0) {
        setDownloadSelectedDevotee(approved[0]);
      }
    } catch (e) {
      console.warn('Error loading download tab data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadDownloadDevoteeEntries = async (userId: string, force = false) => {
    try {
      const monthStr = String(selectedMonth).padStart(2, '0');
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const startDate = `${selectedYear}-${monthStr}-01`;
      const endDate = `${selectedYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
      const entries = await sadhanaService.getEntriesForDateRange(userId, startDate, endDate);
      setDownloadDevoteeEntries(entries);
    } catch (e) {
      console.warn('Error loading devotee download entries:', e);
    }
  };

  // -------------------------------------------------------------
  // DATA LOADERS
  // -------------------------------------------------------------
  const loadDailyData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const [devotees, sDay, wRange] = await Promise.all([
        authService.getAllCounselees(forceRefresh),
        sadhanaService.getAllEntriesForDate(selectedDailyDate, forceRefresh),
        sadhanaService.getAllEntriesForDateRange(weekStartDate, weekEndDate, forceRefresh),
      ]);
      setAllCounselees(devotees.filter((u) => u.status === 'approved'));
      setSingleDayEntries(sDay);
      setWeekEntries(wRange);
    } catch (e) {
      console.warn('Error loading daily reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadWeeklyData = async () => {
    setIsLoading(true);
    try {
      const devotees = await authService.getAllCounselees();
      const approved = devotees.filter((u) => u.status === 'approved');
      setAllCounselees(approved);

      const reports = await Promise.all(
        approved.map((u) =>
          reportService.generateWeeklyReport({
            userId: u.uid,
            counseleeName: u.displayName,
            weekDateString: todayStr,
            publishSharedSummary: true,
            publicConsent: u.publicAppreciationConsent,
          })
        )
      );
      setWeeklyReports(reports);
    } catch (e) {
      console.warn('Error loading weekly reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMonthlyData = async () => {
    setIsLoading(true);
    try {
      const devotees = await authService.getAllCounselees();
      const approved = devotees.filter((u) => u.status === 'approved');
      setAllCounselees(approved);

      const reports = await Promise.all(
        approved.map((u) =>
          reportService.generateMonthlyReport({
            userId: u.uid,
            counseleeName: u.displayName,
            year: selectedYear,
            month: selectedMonth,
            publicConsent: u.publicAppreciationConsent,
          })
        )
      );
      setMonthlyReports(reports);
    } catch (e) {
      console.warn('Error loading monthly reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === 'daily') loadDailyData(true);
    else if (activeTab === 'weekly') loadWeeklyData();
    else if (activeTab === 'monthly') loadMonthlyData();
    else if (activeTab === 'download') {
      loadDownloadData(true);
      if (downloadSelectedDevotee) {
        loadDownloadDevoteeEntries(downloadSelectedDevotee.uid, true);
      }
    }
  };

  const filteredDevoteesForDownload = useMemo(() => {
    if (!searchQuery.trim()) return allCounselees;
    const q = searchQuery.toLowerCase();
    return allCounselees.filter(
      (c) =>
        (c.displayName || '').toLowerCase().includes(q) ||
        (c.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [allCounselees, searchQuery]);

  const downloadEntryMap = useMemo(() => {
    const map = new Map<string, SadhanaEntry>();
    downloadDevoteeEntries.forEach((e) => map.set(e.date, e));
    return map;
  }, [downloadDevoteeEntries]);

  const downloadActiveWeek =
    downloadMonthWeeks.find((w) => w.weekIndex === downloadSelectedWeekIndex) || downloadMonthWeeks[0];

  const downloadAllMonthDates = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthStr = String(selectedMonth).padStart(2, '0');
    const list: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      list.push(`${selectedYear}-${monthStr}-${String(i).padStart(2, '0')}`);
    }
    return list;
  }, [selectedYear, selectedMonth]);

  const downloadTargetDates =
    downloadSubTab === 'week' ? (downloadActiveWeek ? downloadActiveWeek.dates : []) : downloadAllMonthDates;

  const downloadStats = useMemo(() => {
    let filled = 0;
    let totalRounds = 0;
    let totalMorningRounds = 0;
    let totalHearing = 0;
    let totalReading = 0;
    let totalSleepMin = 0;
    let totalScore = 0;
    let mangalaCount = 0;

    downloadTargetDates.forEach((dStr) => {
      const e = downloadEntryMap.get(dStr);
      if (e) {
        filled++;
        totalRounds += e.completedRounds ?? 0;
        totalHearing += e.hearingMinutes ?? 0;
        totalReading += e.readingMinutes ?? 0;
        totalScore += e.percentage ?? 0;
        if (e.morningProgrammeAttended) mangalaCount++;
        totalSleepMin += calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr);
      }
    });

    const totalDays = downloadTargetDates.length || 1;
    const overallPercentage = Math.round(totalScore / totalDays);
    const avgSleep = filled > 0 ? formatMinutesToHours(Math.round(totalSleepMin / filled)) : 'N/A';

    return {
      filled,
      totalDays,
      totalRounds,
      totalMorningRounds,
      totalHearing,
      totalReading,
      overallPercentage,
      mangalaCount,
      avgSleep,
      avgWake: '—',
      avgBed: '—',
    };
  }, [downloadTargetDates, downloadEntryMap]);

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const handleDownloadExcel = async () => {
    if (!downloadSelectedDevotee) {
      Alert.alert('Selection Required', 'Please select a counselee to export their report.');
      return;
    }
    setIsExportingCsv(true);
    try {
      const devName = downloadSelectedDevotee.displayName || 'Devotee';
      const devPhone = downloadSelectedDevotee.phoneNumber || 'N/A';
      const devEmail = downloadSelectedDevotee.email || 'N/A';
      const devTarget = downloadSelectedDevotee.declaredRounds || 16;

      const isWeekMode = downloadSubTab === 'week';
      const curWeek = downloadMonthWeeks.find((w) => w.weekIndex === downloadSelectedWeekIndex) || downloadMonthWeeks[0];
      const periodLabel = isWeekMode
        ? `Week ${curWeek.weekIndex} (${curWeek.rangeLabel})`
        : `Full Month ${monthNames[selectedMonth - 1]} ${selectedYear}`;

      const targetDates = isWeekMode ? curWeek.dates : downloadAllMonthDates;

      // Build CSV Lines
      const lines: string[] = [];
      lines.push(`Bhakti Unnati - Counselee Sadhana Progress Report`);
      lines.push(`Counselee Name:,${escapeCsv(devName)},Mobile Number:,${escapeCsv(devPhone)}`);
      lines.push(`Email:,${escapeCsv(devEmail)},Target Rounds:,${escapeCsv(devTarget)}`);
      lines.push(`Report Period:,${escapeCsv(periodLabel)},Generated On:,${escapeCsv(new Date().toLocaleString())}`);
      lines.push(''); // blank line

      // Table Header
      lines.push(
        [
          'Date',
          'Day',
          'Wake Up Time',
          'Bed Time',
          'Sleep Duration',
          'Chanting Target',
          'Chanting Completed',
          'Morning Rounds',
          'Hearing (Minutes)',
          'Hearing Topic/Speaker',
          'Reading (Minutes)',
          'Reading Book',
          'Mangala Aarti',
          'Other Seva / Slokas',
          'Daily Score %',
          'Grade',
        ]
          .map(escapeCsv)
          .join(',')
      );

      let totalFilled = 0;
      let totalRounds = 0;
      let totalHearing = 0;
      let totalReading = 0;
      let totalSleepMin = 0;
      let totalPercentage = 0;
      let validScoreCount = 0;

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      targetDates.forEach((dStr) => {
        const e = downloadEntryMap.get(dStr);
        const [y, m, d] = dStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d);
        const dayName = dayNames[dObj.getDay()];

        if (e) {
          totalFilled++;
          const score = e.percentage ?? 0;
          totalPercentage += score;
          validScoreCount++;

          const rounds = e.completedRounds ?? 0;
          totalRounds += rounds;

          const hearMin = e.hearingMinutes ?? 0;
          totalHearing += hearMin;

          const readMin = e.readingMinutes ?? 0;
          totalReading += readMin;

          const sleepMin = calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr);
          totalSleepMin += sleepMin;

          const grade = e.grade || (score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D');

          lines.push(
            [
              dStr,
              dayName,
              e.wakeUpTimeStr || 'N/A',
              e.sleepTimeStr || 'N/A',
              formatMinutesToHours(sleepMin),
              e.declaredRounds || devTarget,
              rounds,
              e.completionTimeStr || 'N/A',
              hearMin,
              'Spiritual Hearing',
              readMin,
              "Prabhupada's Books",
              e.morningProgrammeAttended ? 'Yes' : 'No',
              e.serviceAttended ? 'Service Attended' : 'N/A',
              `${score}%`,
              grade,
            ]
              .map(escapeCsv)
              .join(',')
          );
        } else {
          lines.push(
            [
              dStr,
              dayName,
              'Not Filled',
              'Not Filled',
              'N/A',
              devTarget,
              0,
              'N/A',
              0,
              'N/A',
              0,
              'N/A',
              'No',
              'N/A',
              '0%',
              'Not Submitted',
            ]
              .map(escapeCsv)
              .join(',')
          );
        }
      });

      // Summary row
      const avgPercentage = validScoreCount > 0 ? Math.round(totalPercentage / targetDates.length) : 0;
      const finalGrade =
        avgPercentage >= 80
          ? 'A (Excellent)'
          : avgPercentage >= 65
          ? 'B (Good)'
          : avgPercentage >= 50
          ? 'C (Average)'
          : 'D (Needs Guidance)';
      const avgSleepStr =
        totalFilled > 0 ? formatMinutesToHours(Math.round(totalSleepMin / totalFilled)) : 'N/A';

      lines.push('');
      lines.push(
        [
          'SUMMARY TOTALS / AVERAGES',
          `Filled ${totalFilled} / ${targetDates.length} Days`,
          '',
          '',
          `Avg Sleep: ${avgSleepStr}`,
          '',
          `Total Rounds: ${totalRounds}`,
          '',
          `Total Hearing: ${totalHearing}m`,
          '',
          `Total Reading: ${totalReading}m`,
          '',
          '',
          '',
          `Final Consistency: ${avgPercentage}%`,
          finalGrade,
        ]
          .map(escapeCsv)
          .join(',')
      );

      const csvString = lines.join('\r\n');
      const sanitizedName = devName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${sanitizedName}_Sadhana_${
        isWeekMode ? `Week${curWeek.weekIndex}` : `Month_${monthNames[selectedMonth - 1]}`
      }_${selectedYear}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Download Complete', `Excel spreadsheet "${fileName}" downloaded successfully.`);
      } else {
        await Share.share({
          title: fileName,
          message: csvString,
        }).catch(() => {
          Clipboard.setStringAsync(csvString);
          Alert.alert('Copied to Clipboard', `CSV report for ${devName} copied to clipboard.`);
        });
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not generate excel spreadsheet.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Helper date shifting for Single Day view
  const shiftDailyDate = (days: number) => {
    const [y, m, d] = selectedDailyDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setSelectedDailyDate(`${newY}-${newM}-${newD}`);
  };

  // Helper month shifting
  const shiftMonth = (delta: number) => {
    let newM = selectedMonth + delta;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedYear(newY);
    setSelectedMonth(newM);
  };

  // Attendance toggling
  const handleToggleWeeklyAttendance = async (
    userId: string,
    type: 'morning_programme' | 'service' | 'weekly_class',
    currentAttended: boolean
  ) => {
    setUpdatingId(`${userId}_${type}`);
    try {
      await attendanceService.recordWeeklyAttendance({
        userId,
        weekId: currentWeekId,
        type,
        scheduledDate: todayStr,
        attended: !currentAttended,
        updatedBy: user?.uid || 'admin',
      });
      await loadWeeklyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleMonthlySatsanga = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    const monthId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setUpdatingId(`${userId}_satsanga`);
    try {
      await attendanceService.recordMonthlySatsanga({
        userId,
        monthId,
        scheduledDate: todayStr,
        status: nextStatus as any,
        updatedBy: user?.uid || 'admin',
      });
      await loadMonthlyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update satsanga attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleMonthlyMeeting = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    const monthId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setUpdatingId(`${userId}_meeting`);
    try {
      await attendanceService.recordMonthlyMeeting({
        userId,
        monthId,
        scheduledDate: todayStr,
        status: nextStatus as any,
        updatedBy: user?.uid || 'admin',
      });
      await loadMonthlyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update counsellor meeting attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME SEARCH FILTERING
  // -------------------------------------------------------------
  const queryLower = searchQuery.trim().toLowerCase();

  const filterDevotee = (name?: string, phone?: string, declared?: number) => {
    if (!queryLower) return true;
    if (name && name.toLowerCase().includes(queryLower)) return true;
    if (phone && phone.toLowerCase().includes(queryLower)) return true;
    if (declared !== undefined && String(declared).includes(queryLower)) return true;
    return false;
  };

  // Daily: Devotee Week Summaries
  const devoteeWeekSummaries: DevoteeWeekSummary[] = useMemo(() => {
    return allCounselees
      .filter((d) => filterDevotee(d.displayName, d.phoneNumber, d.declaredRounds))
      .map((devotee) => {
        const userEntries = weekEntries.filter((e) => e.userId === devotee.uid);
        const dayMap: { [dateStr: string]: SadhanaEntry | undefined } = {};
        let totalScore = 0;
        let totalPerc = 0;

        userEntries.forEach((e) => {
          dayMap[e.date] = e;
          totalScore += e.dailyTotalScore ?? 0;
          totalPerc += e.percentage ?? 0;
        });

        const submittedCount = userEntries.length;
        const avgPercentage = submittedCount > 0 ? Math.round(totalPerc / submittedCount) : 0;

        return {
          user: devotee,
          submittedCount,
          totalScore,
          avgPercentage,
          dayMap,
        };
      });
  }, [allCounselees, weekEntries, queryLower]);

  // Daily: Single Day Entries
  const filteredSingleDayEntries = useMemo(() => {
    return singleDayEntries.filter((e) => {
      const matchSearch = filterDevotee(e.counseleeName, undefined, undefined);
      if (!matchSearch) return false;
      if (dailyFilterMode === 'lowScore') return (e.percentage ?? 0) < 50;
      return true;
    });
  }, [singleDayEntries, queryLower, dailyFilterMode]);

  // Weekly: Reports
  const filteredWeeklyReports = useMemo(() => {
    return weeklyReports.filter((r) => {
      const devotee = allCounselees.find((c) => c.uid === r.userId);
      const matchSearch = filterDevotee(r.counseleeName, devotee?.phoneNumber, devotee?.declaredRounds);
      if (!matchSearch) return false;
      if (weeklyFilterMode === 'lowScore') return (r.percentage ?? 0) < 50;
      return true;
    });
  }, [weeklyReports, allCounselees, queryLower, weeklyFilterMode]);

  // Monthly: Reports
  const filteredMonthlyReports = useMemo(() => {
    return monthlyReports.filter((r) => {
      const devotee = allCounselees.find((c) => c.uid === r.userId);
      const matchSearch = filterDevotee(r.counseleeName, devotee?.phoneNumber, devotee?.declaredRounds);
      if (!matchSearch) return false;
      if (monthlyFilterMode === 'lowScore') return (r.percentage ?? 0) < 50;
      return true;
    });
  }, [monthlyReports, allCounselees, queryLower, monthlyFilterMode]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Reports"
        subtitle="Devotee Daily, Weekly & Monthly Audits"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* 4 Main Tabs: Daily, Weekly, Monthly, Download */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {(['daily', 'weekly', 'monthly', 'download'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label =
            tab === 'daily'
              ? 'Daily'
              : tab === 'weekly'
              ? 'Weekly'
              : tab === 'monthly'
              ? 'Monthly'
              : 'Download';
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                isActive && [styles.tabButtonActive, { backgroundColor: theme.thickColor }],
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : theme.colors.textMuted },
                  isActive && { fontWeight: 'bold' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Real-time Search Box */}
      <View style={[styles.searchBoxCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={18} color={theme.thickColor} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search devotee by name, phone or rounds..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading {activeTab} devotional audit records...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================================= */}
          {/* TAB 1: DAILY REPORTS                                      */}
          {/* ========================================================= */}
          {activeTab === 'daily' && (
            <View>
              {/* Daily View Mode Selector: 1-Week Matrix vs Single Day */}
              <View style={styles.subModeRow}>
                <TouchableOpacity
                  style={[
                    styles.subModeBtn,
                    dailyViewMode === 'week' && [styles.subModeBtnActive, { backgroundColor: theme.thickColor }],
                  ]}
                  onPress={() => setDailyViewMode('week')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={dailyViewMode === 'week' ? '#FFFFFF' : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.subModeBtnText,
                      { color: dailyViewMode === 'week' ? '#FFFFFF' : theme.colors.textMuted },
                    ]}
                  >
                    7-Day Devotee Matrix
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subModeBtn,
                    dailyViewMode === 'single' && [styles.subModeBtnActive, { backgroundColor: theme.thickColor }],
                  ]}
                  onPress={() => setDailyViewMode('single')}
                >
                  <Ionicons
                    name="today-outline"
                    size={15}
                    color={dailyViewMode === 'single' ? '#FFFFFF' : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.subModeBtnText,
                      { color: dailyViewMode === 'single' ? '#FFFFFF' : theme.colors.textMuted },
                    ]}
                  >
                    Single Day Detailed View
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Single Day Date Picker Bar */}
              {dailyViewMode === 'single' && (
                <View style={[styles.dateSelectorBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TouchableOpacity onPress={() => shiftDailyDate(-1)} style={styles.dateArrowBtn}>
                    <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                      {selectedDailyDate === todayStr ? 'Today (IST)' : selectedDailyDate}
                    </Text>
                    <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                      {filteredSingleDayEntries.length} Devotee Cards Submitted
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => shiftDailyDate(1)} style={styles.dateArrowBtn}>
                    <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Single Day Filter Chips */}
              {dailyViewMode === 'single' && (
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      dailyFilterMode === 'all' && [styles.filterChipActive, { backgroundColor: theme.thickColor }],
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setDailyFilterMode('all')}
                  >
                    <Text style={[styles.filterChipText, { color: dailyFilterMode === 'all' ? '#FFFFFF' : theme.colors.text }]}>
                      All Cards ({singleDayEntries.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      dailyFilterMode === 'lowScore' && [styles.filterChipActive, { backgroundColor: theme.colors.danger }],
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setDailyFilterMode(dailyFilterMode === 'lowScore' ? 'all' : 'lowScore')}
                  >
                    <Text style={[styles.filterChipText, { color: dailyFilterMode === 'lowScore' ? '#FFFFFF' : theme.colors.danger }]}>
                      Low Score &lt; 50% ({singleDayEntries.filter((e) => (e.percentage ?? 0) < 50).length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 7-DAY MATRIX VIEW */}
              {dailyViewMode === 'week' && (
                <View>
                  {/* Week Navigation Selector Bar */}
                  <View
                    style={[
                      styles.dateSelectorBar,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setDailyWeekOffset((prev) => prev - 1)}
                      style={styles.dateArrowBtn}
                    >
                      <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                        {dailyWeekOffset === 0
                          ? 'Current 7 Days'
                          : `${past7Days[6].label} — ${past7Days[0].label}`}
                      </Text>
                      <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                        {past7Days[6].dateStr} to {past7Days[0].dateStr}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDailyWeekOffset((prev) => Math.min(0, prev + 1))}
                      style={[styles.dateArrowBtn, dailyWeekOffset >= 0 && { opacity: 0.3 }]}
                      disabled={dailyWeekOffset >= 0}
                    >
                      <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                    Past 7 Days Audit: {past7Days[6].label} to {past7Days[0].label} ({devoteeWeekSummaries.length} devotees)
                  </Text>

                  {devoteeWeekSummaries.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="search-outline" size={36} color={theme.colors.textMuted} />
                      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                        No devotees match "{searchQuery}"
                      </Text>
                    </View>
                  ) : (
                    devoteeWeekSummaries.map((item) => {
                      const isExpanded = expandedDevoteeId === item.user.uid;
                      return (
                        <View
                          key={item.user.uid}
                          style={[
                            styles.devoteeCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                          ]}
                        >
                          {/* Devotee Header Row */}
                          <TouchableOpacity
                            style={styles.devoteeHeaderRow}
                            onPress={() => setExpandedDevoteeId(isExpanded ? null : item.user.uid)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.devoteeName, { color: theme.thickColor }]}>
                                  {item.user.displayName || 'Devotee'}
                                </Text>
                                <View style={[styles.targetPill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                                  <Text style={[styles.targetPillText, { color: theme.thickColor }]}>
                                    🎯 {item.user.declaredRounds || 16} Rds
                                  </Text>
                                </View>
                              </View>
                              <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                                {item.user.phoneNumber || 'No phone'} • Submitted {item.submittedCount}/7 days
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Text style={[styles.avgScoreText, { color: item.avgPercentage >= 50 ? theme.thickColor : theme.colors.danger }]}>
                                {item.avgPercentage}% Avg
                              </Text>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={theme.colors.textMuted}
                              />
                            </View>
                          </TouchableOpacity>

                          {/* 7-Day Mini Dots Strip */}
                          <View style={[styles.weekDaysStrip, { borderTopColor: theme.colors.borderLight }]}>
                            {past7Days.map((day) => {
                              const entry = item.dayMap[day.dateStr];
                              const isFilled = !!entry;
                              const isGood = (entry?.percentage ?? 0) >= 50;
                              return (
                                <View key={day.dateStr} style={styles.dayMiniCol}>
                                  <Text style={[styles.dayMiniDateNum, { color: theme.thickColor }]}>{day.dateNum}</Text>
                                  <Text style={[styles.dayMiniLabel, { color: theme.colors.textMuted }]}>{day.dayName}</Text>
                                  <View
                                    style={[
                                      styles.dayDot,
                                      {
                                        backgroundColor: isFilled
                                          ? isGood
                                            ? theme.colors.success
                                            : theme.colors.danger
                                          : theme.colors.surfaceVariant,
                                      },
                                    ]}
                                  >
                                    <Text style={styles.dayDotText}>
                                      {isFilled ? `${entry?.dailyTotalScore ?? 0}` : '—'}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          {/* Expanded Full Devotee Details */}
                          {isExpanded && (
                            <View style={[styles.expandedContent, { borderTopColor: theme.colors.borderLight }]}>
                              <Text style={[styles.expandedHeading, { color: theme.thickColor }]}>
                                7-Day Detailed Submissions
                              </Text>
                              {past7Days.map((day) => {
                                const entry = item.dayMap[day.dateStr];
                                if (!entry) {
                                  return (
                                    <View key={day.dateStr} style={[styles.missingDayRow, { backgroundColor: theme.liteColor }]}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.missingDayDate, { color: theme.colors.textMuted }]}>
                                          {day.label} ({day.dayName})
                                        </Text>
                                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted }}>
                                          0/50
                                        </Text>
                                      </View>
                                      <Text style={[styles.missingDayBadge, { color: theme.colors.danger }]}>
                                        Pending / Not Submitted
                                      </Text>
                                    </View>
                                  );
                                }
                                const nightSleepMins = calculateSleepDurationMinutes(entry.sleepTimeStr, entry.wakeUpTimeStr);
                                const totalSleptMins = nightSleepMins + (Number(entry.restMinutes) || 0);
                                return (
                                  <View key={day.dateStr} style={[styles.entryDetailRow, { borderColor: theme.colors.borderLight }]}>
                                    <View style={styles.entryDetailHeader}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <Text style={[styles.entryDetailDate, { color: theme.colors.text }]}>
                                          {day.label} ({day.dayName})
                                        </Text>
                                        <View
                                          style={[
                                            styles.scorePillBadge,
                                            {
                                              backgroundColor: theme.liteColor,
                                              borderColor: theme.thickColor,
                                            },
                                          ]}
                                        >
                                          <Text style={[styles.scorePillBadgeText, { color: theme.thickColor }]}>
                                            {entry.dailyTotalScore ?? 0}/50
                                          </Text>
                                        </View>
                                      </View>
                                      <StatusBadge type="grade" value={entry.grade} />
                                    </View>
                                    <Text style={[styles.entryDetailStats, { color: theme.colors.textMuted }]}>
                                      📿 Chanting: {entry.completedRounds || 0} / {entry.declaredRounds || 16} rounds ({entry.japaMarks}/10) • Done at {formatFriendlyTime(entry.completionTimeStr)}
                                      {'\n'}📖 Reading: {entry.readingMinutes || 0}m ({entry.readingMarks}/10)
                                      {'\n'}🎧 Hearing: {entry.hearingMinutes || 0}m ({entry.hearingMarks}/10)
                                      {'\n'}🛏️ Sleep Routine: Bed {formatFriendlyTime(entry.sleepTimeStr || '21:30')}, Wake {formatFriendlyTime(entry.wakeUpTimeStr || '03:30')} (Night: {formatMinutesToHours(nightSleepMins)}), Day Rest: {entry.restMinutes || 0}m • Total Slept: {formatMinutesToHours(totalSleptMins)} ({entry.sleepMarks}/10)
                                      {'\n'}💻 Online Reading: {entry.onlineReadingAttended ? 'Attended (+50)' : 'Not attended'}
                                      {'\n'}🌅 Morning Programme: {entry.morningProgrammeAttended ? 'Attended (+50)' : 'Not attended'}
                                      {entry.serviceAttended ? `\n🙏 Service: Attended (+10)` : ''}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* SINGLE DAY DETAILED VIEW */}
              {dailyViewMode === 'single' && (
                <View>
                  {filteredSingleDayEntries.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="document-text-outline" size={36} color={theme.colors.textMuted} />
                      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                        No submitted cards found for {selectedDailyDate} matching filter.
                      </Text>
                    </View>
                  ) : (
                    filteredSingleDayEntries.map((entry) => {
                      const nightSleepMins = calculateSleepDurationMinutes(entry.sleepTimeStr, entry.wakeUpTimeStr);
                      const totalSleptMins = nightSleepMins + (Number(entry.restMinutes) || 0);
                      return (
                        <View
                          key={entry.id || entry.userId}
                          style={[
                            styles.singleCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                          ]}
                        >
                          <View style={styles.singleCardHeader}>
                            <View>
                              <Text style={[styles.devoteeName, { color: theme.thickColor }]}>
                                {entry.counseleeName || 'Devotee'}
                              </Text>
                              <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                                Total Score: {entry.dailyTotalScore}/50 • {entry.percentage}%
                              </Text>
                            </View>
                            <StatusBadge type="grade" value={entry.grade} />
                          </View>

                          <View style={[styles.dividerH, { backgroundColor: theme.colors.borderLight }]} />

                          {/* Complete Devotee Breakdown */}
                          <View style={styles.breakdownGrid}>
                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Chanting</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                {entry.completedRounds || 0} Rds
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                Done @ {formatFriendlyTime(entry.completionTimeStr)} ({entry.japaMarks}/10)
                              </Text>
                            </View>

                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Reading</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                {entry.readingMinutes || 0}m
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                {entry.readingMarks}/10 pts
                              </Text>
                            </View>

                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Hearing</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                {entry.hearingMinutes || 0}m
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                {entry.hearingMarks}/10 pts
                              </Text>
                            </View>

                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Sleep & Rest</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                Total: {formatMinutesToHours(totalSleptMins)}
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                Bed {formatFriendlyTime(entry.sleepTimeStr || '21:30')} • Wake {formatFriendlyTime(entry.wakeUpTimeStr || '03:30')} (Night {formatMinutesToHours(nightSleepMins)}, Rest {entry.restMinutes || 0}m)
                              </Text>
                            </View>
                          </View>

                          {/* Extra Session Badges */}
                          <View style={styles.extraSessionsRow}>
                            <View
                              style={[
                                styles.sessionBadge,
                                {
                                  backgroundColor: entry.onlineReadingAttended ? '#DCFCE7' : '#F3F4F6',
                                  borderColor: entry.onlineReadingAttended ? '#86EFAC' : '#E5E7EB',
                                },
                              ]}
                            >
                              <Ionicons
                                name={entry.onlineReadingAttended ? 'checkmark-circle' : 'close-circle'}
                                size={14}
                                color={entry.onlineReadingAttended ? '#15803D' : '#9CA3AF'}
                              />
                              <Text
                                style={[
                                  styles.sessionBadgeText,
                                  { color: entry.onlineReadingAttended ? '#15803D' : '#6B7280' },
                                ]}
                              >
                                Online Reading: {entry.onlineReadingAttended ? 'Yes (+50)' : 'No'}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.sessionBadge,
                                {
                                  backgroundColor: entry.morningProgrammeAttended ? '#DCFCE7' : '#F3F4F6',
                                  borderColor: entry.morningProgrammeAttended ? '#86EFAC' : '#E5E7EB',
                                },
                              ]}
                            >
                              <Ionicons
                                name={entry.morningProgrammeAttended ? 'checkmark-circle' : 'close-circle'}
                                size={14}
                                color={entry.morningProgrammeAttended ? '#15803D' : '#9CA3AF'}
                              />
                              <Text
                                style={[
                                  styles.sessionBadgeText,
                                  { color: entry.morningProgrammeAttended ? '#15803D' : '#6B7280' },
                                ]}
                              >
                                Morning Prog: {entry.morningProgrammeAttended ? 'Yes (+50)' : 'No'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 2: WEEKLY REPORTS                                     */}
          {/* ========================================================= */}
          {activeTab === 'weekly' && (
            <View>
              {/* Week Info Banner */}
              <View style={[styles.infoBanner, { backgroundColor: theme.liteColor, borderColor: theme.colors.border }]}>
                <Ionicons name="information-circle-outline" size={20} color={theme.thickColor} />
                <Text style={[styles.infoBannerText, { color: theme.colors.text }]}>
                  Week: {currentWeekStart} to {currentWeekEnd} ({filteredWeeklyReports.length} Devotees)
                </Text>
              </View>

              {/* Weekly Filter Chips */}
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    weeklyFilterMode === 'all' && [styles.filterChipActive, { backgroundColor: theme.thickColor }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setWeeklyFilterMode('all')}
                >
                  <Text style={[styles.filterChipText, { color: weeklyFilterMode === 'all' ? '#FFFFFF' : theme.colors.text }]}>
                    All Devotees ({weeklyReports.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    weeklyFilterMode === 'lowScore' && [styles.filterChipActive, { backgroundColor: theme.colors.danger }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setWeeklyFilterMode(weeklyFilterMode === 'lowScore' ? 'all' : 'lowScore')}
                >
                  <Text style={[styles.filterChipText, { color: weeklyFilterMode === 'lowScore' ? '#FFFFFF' : theme.colors.danger }]}>
                    Low Score &lt; 50% ({weeklyReports.filter((r) => (r.percentage ?? 0) < 50).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredWeeklyReports.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="bar-chart-outline" size={36} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No weekly reports match "{searchQuery}"
                  </Text>
                </View>
              ) : (
                filteredWeeklyReports.map((report) => {
                  const devotee = allCounselees.find((u) => u.uid === report.userId);
                  const isExpanded = expandedWeeklyUserId === report.userId;
                  const isMorningUpdating = updatingId === `${report.userId}_morning_programme`;
                  const isServiceUpdating = updatingId === `${report.userId}_service`;
                  const weekDates = getWeekDetails(report.startDate).dates;

                  return (
                    <View
                      key={report.userId}
                      style={[styles.reportCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      {/* Devotee Row */}
                      <View style={styles.reportCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.devoteeName, { color: theme.thickColor }]}>
                              {report.counseleeName || 'Devotee'}
                            </Text>
                            <View style={[styles.targetPill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                              <Text style={[styles.targetPillText, { color: theme.thickColor }]}>
                                🎯 {devotee?.declaredRounds || 16} Rds
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                            {devotee?.phoneNumber || 'No phone'}
                          </Text>
                        </View>
                        <StatusBadge type="grade" value={report.grade} />
                      </View>

                      {/* Weekly Score Summary: Strictly 0 / 410 */}
                      <ScoreCard
                        title={`Score: ${report.totalScore.toFixed(1)} / 410`}
                        score={report.totalScore}
                        maxScore={410}
                        percentage={report.percentage}
                        grade={report.grade}
                        breakdown={{
                          classMarks: report.weeklyServiceMarks,
                          morningMarks: report.morningProgrammeMarks,
                          onlineReadingMarks: report.onlineReadingMarks,
                        }}
                      />

                      {/* Weekly Metrics Aggregate Box */}
                      <View style={styles.breakdownGrid}>
                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Rounds</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {report.totalRounds}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Week Japa
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Reading</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {formatMinutesToHours(report.totalReadingMinutes)}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Total Read
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Hearing</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {formatMinutesToHours(report.totalHearingMinutes)}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Total Heard
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Online Read</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {report.onlineReadingDaysAttended}d
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            {report.onlineReadingMarks} Marks
                          </Text>
                        </View>
                      </View>

                      {/* Attendance Toggles for Counsellor */}
                      <View style={[styles.attendanceSection, { borderTopColor: theme.colors.borderLight }]}>
                        <Text style={[styles.attendanceTitle, { color: theme.thickColor }]}>
                          Counsellor Attendance Verification (Tap to Grant/Revoke):
                        </Text>
                        <View style={styles.attendanceButtonsRow}>
                          {/* Morning Programme (50 Marks) Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.attendanceBtn,
                              {
                                backgroundColor: report.morningProgrammeAttendance ? '#DCFCE7' : '#FEE2E2',
                                borderColor: report.morningProgrammeAttendance ? '#86EFAC' : '#FCA5A5',
                              },
                            ]}
                            disabled={isMorningUpdating}
                            onPress={() =>
                              handleToggleWeeklyAttendance(
                                report.userId,
                                'morning_programme',
                                report.morningProgrammeAttendance
                              )
                            }
                          >
                            {isMorningUpdating ? (
                              <ActivityIndicator size="small" color="#15803D" />
                            ) : (
                              <>
                                <Ionicons
                                  name={report.morningProgrammeAttendance ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={report.morningProgrammeAttendance ? '#15803D' : '#DC2626'}
                                />
                                <Text
                                  style={[
                                    styles.attendanceBtnText,
                                    { color: report.morningProgrammeAttendance ? '#15803D' : '#DC2626' },
                                  ]}
                                >
                                  Morning Prog: {report.morningProgrammeAttendance ? '50 Marks' : 'Pending'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          {/* Weekly Service (10 Marks) Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.attendanceBtn,
                              {
                                backgroundColor: report.weeklyServiceAttendance ? '#DCFCE7' : '#FEE2E2',
                                borderColor: report.weeklyServiceAttendance ? '#86EFAC' : '#FCA5A5',
                              },
                            ]}
                            disabled={isServiceUpdating}
                            onPress={() =>
                              handleToggleWeeklyAttendance(
                                report.userId,
                                'service',
                                report.weeklyServiceAttendance
                              )
                            }
                          >
                            {isServiceUpdating ? (
                              <ActivityIndicator size="small" color="#15803D" />
                            ) : (
                              <>
                                <Ionicons
                                  name={report.weeklyServiceAttendance ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={report.weeklyServiceAttendance ? '#15803D' : '#DC2626'}
                                />
                                <Text
                                  style={[
                                    styles.attendanceBtnText,
                                    { color: report.weeklyServiceAttendance ? '#15803D' : '#DC2626' },
                                  ]}
                                >
                                  Weekly Service: {report.weeklyServiceAttendance ? '10 Marks' : 'Pending'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Expandable Daily Breakdown: ALL 7 DAYS MUST BE SHOWN */}
                      <TouchableOpacity
                        style={[styles.expandToggleBtn, { borderTopColor: theme.colors.borderLight }]}
                        onPress={() => setExpandedWeeklyUserId(isExpanded ? null : report.userId)}
                      >
                        <Text style={[styles.expandToggleText, { color: theme.thickColor }]}>
                          {isExpanded ? 'Hide 7-Day Daily Breakdown' : 'View 7-Day Daily Breakdown'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.thickColor}
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={[styles.expandedDailyList, { borderTopColor: theme.colors.borderLight }]}>
                          {weekDates.map((dayDate, dayIdx) => {
                            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            const dayName = dayNames[dayIdx] || '';
                            const e = report.dailyEntries[dayIdx];

                            if (e) {
                              const eNightSleep = calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr);
                              const eTotalSleep = eNightSleep + (Number(e.restMinutes) || 0);
                              return (
                                <View key={dayDate} style={[styles.weeklyDailyEntryRow, { borderColor: theme.colors.borderLight }]}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.weeklyDailyEntryDate, { color: theme.colors.text }]}>
                                      {dayName}, {dayDate}
                                    </Text>
                                    <Text style={[styles.weeklyDailyEntryDetails, { color: theme.colors.textMuted }]}>
                                      📿 {e.completedRounds || 0} rds (@ {formatFriendlyTime(e.completionTimeStr)}) • 📖 {e.readingMinutes || 0}m • 🎧 {e.hearingMinutes || 0}m • 🛏️ Slept {formatMinutesToHours(eTotalSleep)}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.weeklyDailyScore, { color: theme.thickColor }]}>
                                      {e.dailyTotalScore}/50
                                    </Text>
                                    <StatusBadge type="grade" value={e.grade} />
                                  </View>
                                </View>
                              );
                            }

                            return (
                              <View key={dayDate} style={[styles.weeklyDailyEntryRow, { borderColor: theme.colors.borderLight, opacity: 0.65 }]}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.weeklyDailyEntryDate, { color: theme.colors.textMuted }]}>
                                    {dayName}, {dayDate}
                                  </Text>
                                  <Text style={[styles.weeklyDailyEntryDetails, { color: theme.colors.danger }]}>
                                    0/50 - Not Submitted
                                  </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={[styles.weeklyDailyScore, { color: theme.colors.textMuted }]}>
                                    0/50
                                  </Text>
                                  <StatusBadge type="custom" value="Daily Sadhana Pending" label="Daily Sadhana Pending" />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 3: MONTHLY REPORTS                                    */}
          {/* ========================================================= */}
          {activeTab === 'monthly' && (
            <View>
              {/* Month Selector Bar */}
              <View style={[styles.dateSelectorBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.dateArrowBtn}>
                  <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </Text>
                  <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                    {filteredMonthlyReports.length} Active Devotee Records (1st to end of month)
                  </Text>
                </View>
                <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.dateArrowBtn}>
                  <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                </TouchableOpacity>
              </View>

              {/* Monthly Filter Chips */}
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    monthlyFilterMode === 'all' && [styles.filterChipActive, { backgroundColor: theme.thickColor }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setMonthlyFilterMode('all')}
                >
                  <Text style={[styles.filterChipText, { color: monthlyFilterMode === 'all' ? '#FFFFFF' : theme.colors.text }]}>
                    All Devotees ({monthlyReports.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    monthlyFilterMode === 'lowScore' && [styles.filterChipActive, { backgroundColor: theme.colors.danger }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setMonthlyFilterMode(monthlyFilterMode === 'lowScore' ? 'all' : 'lowScore')}
                >
                  <Text style={[styles.filterChipText, { color: monthlyFilterMode === 'lowScore' ? '#FFFFFF' : theme.colors.danger }]}>
                    Low Score &lt; 50% ({monthlyReports.filter((r) => (r.percentage ?? 0) < 50).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredMonthlyReports.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="pie-chart-outline" size={36} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No monthly reports match "{searchQuery}"
                  </Text>
                </View>
              ) : (
                filteredMonthlyReports.map((report) => {
                  const devotee = allCounselees.find((u) => u.uid === report.userId);
                  const isSatsangaUpdating = updatingId === `${report.userId}_satsanga`;
                  const isMeetingUpdating = updatingId === `${report.userId}_meeting`;
                  const isSatsangaAttended = report.satsangaStatus === 'attended';
                  const isMeetingAttended = report.counsellorMeetingStatus === 'attended';
                  const submittedCount = report.dailyEntries.filter((e) => e !== null).length;

                  return (
                    <View
                      key={report.userId}
                      style={[styles.reportCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      {/* Devotee Row */}
                      <View style={styles.reportCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.devoteeName, { color: theme.thickColor }]}>
                              {report.counseleeName || 'Devotee'}
                            </Text>
                            <View style={[styles.targetPill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                              <Text style={[styles.targetPillText, { color: theme.thickColor }]}>
                                🎯 {devotee?.declaredRounds || 16} Rds
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                            {devotee?.phoneNumber || 'No phone'} • Submitted {submittedCount} days ({report.startDate} to {report.endDate})
                          </Text>
                        </View>
                        <StatusBadge type="grade" value={report.grade} />
                      </View>

                      {/* Dynamic Score Summary */}
                      <ScoreCard
                        title={`Score: ${report.totalScore.toFixed(1)} / ${report.maxAvailableMarks}`}
                        score={report.totalScore}
                        maxScore={report.maxAvailableMarks}
                        percentage={report.percentage}
                        grade={report.grade}
                        breakdown={{
                          classMarks: report.weeklyServicesMarks,
                          morningMarks: report.morningProgrammesMarks,
                          satsangaMarks: (report.satsangaMarks || 0) + (report.counsellorMeetingMarks || 0),
                        }}
                      />

                      {/* Monthly Metrics Box */}
                      <View style={styles.breakdownGrid}>
                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Rounds</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {report.totalRounds}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Total Japa
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Reading</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {formatMinutesToHours(report.totalReadingMinutes)}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Hours read
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Hearing</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {formatMinutesToHours(report.totalHearingMinutes)}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Hours heard
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Rating</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {report.consistencyRating}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Consistency
                          </Text>
                        </View>
                      </View>

                      {/* Score Components Detail Row */}
                      <View style={{ marginHorizontal: 12, marginTop: 4, marginBottom: 8, padding: 8, backgroundColor: theme.liteColor, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.borderLight }}>
                        <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600', marginBottom: 2 }}>
                          📊 Dynamic Score Details ({report.weekdaysCount} weekdays @ 50, {report.weekendDaysCount} weekends @ 40):
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          • Daily Sadhana: {report.dailySadhanaScore} / {report.maxDailyMarks} marks
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          • Morning Prog: {report.morningProgrammesAttended}/{report.morningProgrammesScheduled} weeks ({report.morningProgrammesMarks} marks)
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          • Weekly Service: {report.weeklyServicesAttended}/{report.weeklyServicesScheduled} weeks ({report.weeklyServicesMarks} marks)
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          • Satsanga: {isSatsangaAttended ? '50 / 50 marks' : '0 / 50 marks'} • Met Counsellor: {isMeetingAttended ? '50 / 50 marks' : '0 / 50 marks'}
                        </Text>
                      </View>

                      {/* Attendance Verification Section for Counsellor */}
                      <View style={[styles.attendanceSection, { borderTopColor: theme.colors.borderLight }]}>
                        <Text style={[styles.attendanceTitle, { color: theme.thickColor }]}>
                          Monthly Attendance & Meetings (Tap to Grant/Revoke 50 Marks):
                        </Text>
                        <View style={styles.attendanceButtonsRow}>
                          {/* Monthly Satsanga (50 Marks) Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.attendanceBtn,
                              {
                                backgroundColor: isSatsangaAttended ? '#DCFCE7' : '#FEE2E2',
                                borderColor: isSatsangaAttended ? '#86EFAC' : '#FCA5A5',
                              },
                            ]}
                            disabled={isSatsangaUpdating}
                            onPress={() => handleToggleMonthlySatsanga(report.userId, report.satsangaStatus)}
                          >
                            {isSatsangaUpdating ? (
                              <ActivityIndicator size="small" color="#15803D" />
                            ) : (
                              <>
                                <Ionicons
                                  name={isSatsangaAttended ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={isSatsangaAttended ? '#15803D' : '#DC2626'}
                                />
                                <Text
                                  style={[
                                    styles.attendanceBtnText,
                                    { color: isSatsangaAttended ? '#15803D' : '#DC2626' },
                                  ]}
                                >
                                  Satsanga: {isSatsangaAttended ? '50 Marks' : 'Pending'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          {/* Monthly Counsellor Meeting (50 Marks) Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.attendanceBtn,
                              {
                                backgroundColor: isMeetingAttended ? '#DCFCE7' : '#FEE2E2',
                                borderColor: isMeetingAttended ? '#86EFAC' : '#FCA5A5',
                              },
                            ]}
                            disabled={isMeetingUpdating}
                            onPress={() => handleToggleMonthlyMeeting(report.userId, report.counsellorMeetingStatus)}
                          >
                            {isMeetingUpdating ? (
                              <ActivityIndicator size="small" color="#15803D" />
                            ) : (
                              <>
                                <Ionicons
                                  name={isMeetingAttended ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={isMeetingAttended ? '#15803D' : '#DC2626'}
                                />
                                <Text
                                  style={[
                                    styles.attendanceBtnText,
                                    { color: isMeetingAttended ? '#15803D' : '#DC2626' },
                                  ]}
                                >
                                  Met Counsellor: {isMeetingAttended ? '50 Marks' : 'Pending'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 4: DOWNLOAD PROGRESS (EXCEL / SPREADSHEET)             */}
          {/* ========================================================= */}
          {activeTab === 'download' && (
            <View style={{ marginTop: 8 }}>
              {/* Devotee Selection Horizontal Chips */}
              <Text style={[styles.sectionSubtitle, { color: theme.thickColor, marginBottom: 8 }]}>
                Select Counselee to View & Download Progress Sheet:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {filteredDevoteesForDownload.map((devotee) => {
                  const isSelected = downloadSelectedDevotee?.uid === devotee.uid;
                  return (
                    <TouchableOpacity
                      key={devotee.uid}
                      style={[
                        styles.downloadDevoteeChip,
                        {
                          backgroundColor: isSelected ? theme.thickColor : theme.colors.card,
                          borderColor: isSelected ? theme.thickColor : theme.colors.border,
                        },
                      ]}
                      onPress={() => setDownloadSelectedDevotee(devotee)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.downloadChipAvatar, { backgroundColor: isSelected ? '#FFFFFF' : theme.liteColor }]}>
                        <Text style={[styles.downloadChipAvatarText, { color: theme.thickColor }]}>
                          {(devotee.displayName || 'D')[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.downloadChipText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {devotee.displayName || 'Devotee'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {downloadSelectedDevotee ? (
                <>
                  {/* Counselee Info & Excel Download Button Bar */}
                  <View style={[styles.downloadHeaderCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.downloadDevoteeName, { color: theme.colors.text }]}>
                        {downloadSelectedDevotee.displayName || 'Devotee'}
                      </Text>
                      <Text style={[styles.downloadDevoteePhone, { color: theme.colors.textMuted }]}>
                        📞 {downloadSelectedDevotee.phoneNumber || 'No phone'} • 📿 Target: {downloadSelectedDevotee.declaredRounds || 16} rounds
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.downloadExcelActionBtn, { backgroundColor: theme.thickColor }]}
                      onPress={handleDownloadExcel}
                      disabled={isExportingCsv}
                      activeOpacity={0.8}
                    >
                      {isExportingCsv ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.downloadExcelActionBtnText}>Download Excel</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Month Selector Bar */}
                  <View style={[styles.dateSelectorBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginTop: 10 }]}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.dateArrowBtn}>
                      <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                        {monthNames[selectedMonth - 1]} {selectedYear}
                      </Text>
                      <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                        Select Week 1 to 4/5 or Monthly Report tab below
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.dateArrowBtn}>
                      <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                    </TouchableOpacity>
                  </View>

                  {/* Week 1, Week 2, Week 3, Week 4, Week 5 + Monthly Report Tabs */}
                  <View style={styles.downloadWeekTabBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {downloadMonthWeeks.map((w) => {
                        const isSelected = downloadSubTab === 'week' && downloadSelectedWeekIndex === w.weekIndex;
                        return (
                          <TouchableOpacity
                            key={w.weekIndex}
                            style={[
                              styles.downloadWeekTabBtn,
                              {
                                backgroundColor: isSelected ? theme.thickColor : theme.colors.card,
                                borderColor: isSelected ? theme.thickColor : theme.colors.border,
                              },
                            ]}
                            onPress={() => {
                              setDownloadSubTab('week');
                              setDownloadSelectedWeekIndex(w.weekIndex);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.downloadWeekTabTitle, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}>
                              {w.label} {w.isCurrentWeek && '• Current'}
                            </Text>
                            <Text style={[styles.downloadWeekTabSub, { color: isSelected ? 'rgba(255,255,255,0.85)' : theme.colors.textMuted }]}>
                              {w.rangeLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Monthly Tab */}
                      <TouchableOpacity
                        style={[
                          styles.downloadWeekTabBtn,
                          {
                            backgroundColor: downloadSubTab === 'month' ? theme.thickColor : theme.colors.card,
                            borderColor: downloadSubTab === 'month' ? theme.thickColor : theme.colors.border,
                          },
                        ]}
                        onPress={() => setDownloadSubTab('month')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.downloadWeekTabTitle, { color: downloadSubTab === 'month' ? '#FFFFFF' : theme.colors.text }]}>
                          Monthly Report
                        </Text>
                        <Text style={[styles.downloadWeekTabSub, { color: downloadSubTab === 'month' ? 'rgba(255,255,255,0.85)' : theme.colors.textMuted }]}>
                          {monthNames[selectedMonth - 1]} (Whole Month)
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>

                  {/* Detailed Data Sheet View (Week or Month) */}
                  <View style={[styles.downloadSheetCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.downloadSheetHeaderRow}>
                      <Text style={[styles.downloadSheetTitle, { color: theme.thickColor }]}>
                        {downloadSubTab === 'week'
                          ? `${downloadActiveWeek?.label}: ${downloadActiveWeek?.rangeLabel} (Monday to Sunday)`
                          : `Full Month: ${monthNames[selectedMonth - 1]} ${selectedYear}`}
                      </Text>
                      <Text style={[styles.downloadSheetSub, { color: theme.colors.textMuted }]}>
                        {downloadTargetDates.length} days • Scroll horizontally to view hearing, reading & sleep times
                      </Text>
                    </View>

                    {/* Table Headers */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View>
                        <View style={[styles.tableGridHeader, { backgroundColor: theme.liteColor, borderColor: theme.colors.border }]}>
                          <Text style={[styles.thCell, { width: 95 }]}>Date & Day</Text>
                          <Text style={[styles.thCell, { width: 85 }]}>Wake Up</Text>
                          <Text style={[styles.thCell, { width: 85 }]}>Bed Time</Text>
                          <Text style={[styles.thCell, { width: 85 }]}>Sleep Hrs</Text>
                          <Text style={[styles.thCell, { width: 85 }]}>Chanting</Text>
                          <Text style={[styles.thCell, { width: 95 }]}>Completion</Text>
                          <Text style={[styles.thCell, { width: 90 }]}>Hearing</Text>
                          <Text style={[styles.thCell, { width: 90 }]}>Reading</Text>
                          <Text style={[styles.thCell, { width: 75 }]}>Morning Pgm</Text>
                          <Text style={[styles.thCell, { width: 75 }]}>Service</Text>
                          <Text style={[styles.thCell, { width: 90 }]}>Score %</Text>
                        </View>

                        {downloadTargetDates.map((dateStr) => {
                          const e = downloadEntryMap.get(dateStr);
                          const hasEntry = !!e;
                          const [y, m, d] = dateStr.split('-').map(Number);
                          const dObj = new Date(y, m - 1, d);
                          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dObj.getDay()];
                          const score = e ? e.percentage ?? 0 : 0;
                          const sleepMin = e ? calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr) : 0;

                          return (
                            <View key={dateStr} style={[styles.tableGridRow, { borderBottomColor: theme.colors.borderLight || '#F3F4F6' }]}>
                              <View style={[styles.tdCellBox, { width: 95 }]}>
                                <Text style={[styles.tdTextBold, { color: theme.colors.text }]}>{dayName} {d}</Text>
                                <Text style={[styles.tdTextSub, { color: theme.colors.textMuted }]}>{dateStr}</Text>
                              </View>
                              <Text style={[styles.tdCell, { width: 85, color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                                {hasEntry ? formatFriendlyTime(e?.wakeUpTimeStr) : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 85, color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                                {hasEntry ? formatFriendlyTime(e?.sleepTimeStr) : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 85, color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                                {hasEntry ? formatMinutesToHours(sleepMin) : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 85, fontWeight: 'bold', color: hasEntry ? theme.thickColor : '#9CA3AF' }]}>
                                {hasEntry ? `${e?.completedRounds ?? 0} rnds` : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 95, color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                                {hasEntry && e?.completionTimeStr ? formatFriendlyTime(e.completionTimeStr) : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 90, color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                                {hasEntry ? `${e?.hearingMinutes ?? 0}m` : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 90, color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                                {hasEntry ? `${e?.readingMinutes ?? 0}m` : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 75, color: e?.morningProgrammeAttended ? '#16A34A' : '#9CA3AF' }]}>
                                {hasEntry ? (e?.morningProgrammeAttended ? 'Yes' : 'No') : '—'}
                              </Text>
                              <Text style={[styles.tdCell, { width: 75, color: e?.serviceAttended ? '#16A34A' : '#9CA3AF' }]}>
                                {hasEntry ? (e?.serviceAttended ? 'Yes' : 'No') : '—'}
                              </Text>
                              <View style={[styles.tdCellBox, { width: 90 }]}>
                                <View
                                  style={[
                                    styles.tableScoreBadge,
                                    {
                                      backgroundColor: hasEntry
                                        ? score >= 70
                                          ? '#DCFCE7'
                                          : score >= 50
                                          ? '#FEF3C7'
                                          : '#FEE2E2'
                                        : '#F3F4F6',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.tableScoreBadgeText,
                                      {
                                        color: hasEntry
                                          ? score >= 70
                                          ? '#15803D'
                                          : score >= 50
                                          ? '#B45309'
                                          : '#DC2626'
                                          : '#9CA3AF',
                                      },
                                    ]}
                                  >
                                    {hasEntry ? `${score}%` : 'Not Filled'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}

                        {/* Summary Bottom Row */}
                        <View style={[styles.tableGridSummary, { backgroundColor: theme.liteColor, borderColor: theme.colors.border }]}>
                          <Text style={[styles.thCellBold, { width: 95, color: theme.thickColor }]}>
                            Summary
                          </Text>
                          <Text style={[styles.thCell, { width: 85 }]}>
                            {downloadStats.avgWake}
                          </Text>
                          <Text style={[styles.thCell, { width: 85 }]}>
                            {downloadStats.avgBed}
                          </Text>
                          <Text style={[styles.thCell, { width: 85 }]}>
                            {downloadStats.avgSleep}
                          </Text>
                          <Text style={[styles.thCellBold, { width: 85, color: theme.thickColor }]}>
                            {downloadStats.totalRounds} rnds
                          </Text>
                          <Text style={[styles.thCell, { width: 95 }]}>
                            {downloadStats.totalMorningRounds} rnds
                          </Text>
                          <Text style={[styles.thCell, { width: 90 }]}>
                            {downloadStats.totalHearing}m
                          </Text>
                          <Text style={[styles.thCell, { width: 110 }]}>—</Text>
                          <Text style={[styles.thCell, { width: 90 }]}>
                            {downloadStats.totalReading}m
                          </Text>
                          <Text style={[styles.thCell, { width: 110 }]}>—</Text>
                          <Text style={[styles.thCell, { width: 75 }]}>
                            {downloadStats.mangalaCount}/{downloadTargetDates.length}
                          </Text>
                          <View style={[styles.tdCellBox, { width: 90 }]}>
                            <View style={[styles.tableScoreBadge, { backgroundColor: theme.thickColor }]}>
                              <Text style={[styles.tableScoreBadgeText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                                {downloadStats.overallPercentage}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                </>
              ) : (
                <View style={styles.emptyDevoteePrompt}>
                  <Ionicons name="people-outline" size={36} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyPromptText, { color: theme.colors.textMuted }]}>
                    Please select a counselee above to view and download their progress sheet.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBoxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12.5,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  subModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  subModeBtnActive: {
    ...THEME.shadows.soft,
  },
  subModeBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  dateSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    ...THEME.shadows.soft,
  },
  dateArrowBtn: {
    padding: 6,
  },
  dateSelectorTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  dateSelectorSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  devoteeCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  devoteeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devoteeName: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  targetPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  targetPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  devoteePhone: {
    fontSize: 11,
    marginTop: 2,
  },
  avgScoreText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  weekDaysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  dayMiniCol: {
    alignItems: 'center',
    gap: 3,
  },
  dayMiniDateNum: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 1,
  },
  dayMiniLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  dayDot: {
    width: 28,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  expandedHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  missingDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  missingDayDate: {
    fontSize: 11,
  },
  missingDayBadge: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  entryDetailRow: {
    paddingVertical: 5,
    borderBottomWidth: 0.8,
  },
  entryDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryDetailDate: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  scorePillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  scorePillBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  entryDetailStats: {
    fontSize: 10.5,
    lineHeight: 16,
  },
  singleCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  singleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dividerH: {
    height: 1,
    marginVertical: 8,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 4,
    gap: 6,
  },
  breakdownBox: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownBoxLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  breakdownBoxVal: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 1,
  },
  breakdownBoxSub: {
    fontSize: 10,
    marginTop: 1,
  },
  extraSessionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  sessionBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  serviceNote: {
    fontSize: 10.5,
    marginTop: 6,
    fontStyle: 'italic',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  infoBannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  reportCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attendanceSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attendanceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  attendanceButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  attendanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  attendanceBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  expandedDailyList: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  noDailyEntriesText: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
  },
  weeklyDailyEntryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.8,
  },
  weeklyDailyEntryDate: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  weeklyDailyEntryDetails: {
    fontSize: 10,
    marginTop: 1,
  },
  weeklyDailyScore: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  downloadDevoteeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  downloadChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadChipAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  downloadChipText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 130,
  },
  downloadHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  downloadDevoteeName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  downloadDevoteePhone: {
    fontSize: 11,
    marginTop: 2,
  },
  downloadExcelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadExcelActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  downloadWeekTabBar: {
    marginTop: 8,
    marginBottom: 10,
  },
  downloadWeekTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadWeekTabTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  downloadWeekTabSub: {
    fontSize: 9.5,
    marginTop: 2,
  },
  downloadSheetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  downloadSheetHeaderRow: {
    marginBottom: 10,
  },
  downloadSheetTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  downloadSheetSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  tableGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  tableGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  tableGridSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  thCellBold: {
    fontSize: 11.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tdCell: {
    fontSize: 11,
    textAlign: 'center',
  },
  tdCellBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tdTextBold: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tdTextSub: {
    fontSize: 9,
  },
  tableScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tableScoreBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyDevoteePrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPromptText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});
