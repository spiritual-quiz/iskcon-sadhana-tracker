import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { vaishnavaCalendarService, VaishnavaEvent } from '../services/vaishnavaCalendarService';
import { getTodayDateStringIST } from '../utils/dateUtils';

export const VaishnavaCalendarCard: React.FC = () => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const todayStr = getTodayDateStringIST();
  const todayEvent = vaishnavaCalendarService.getTodaysEvent(todayStr);
  const nextEkadashi = vaishnavaCalendarService.getNextEkadashi(todayStr);
  const upcomingEvents = vaishnavaCalendarService.getUpcomingEvents(todayStr, 21);

  const formatShortDate = (isoStr: string) => {
    if (!isoStr || !isoStr.includes('-')) return isoStr;
    const [y, m, d] = isoStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
  };

  const getFastingBadge = (fasting: VaishnavaEvent['fasting']) => {
    switch (fasting) {
      case 'full':
        return { label: 'Nirjala (Full Fast)', color: '#DC2626', bg: '#FEE2E2' };
      case 'phalahari':
        return { label: 'No Grains/Beans', color: '#D97706', bg: '#FEF3C7' };
      case 'noon':
        return { label: 'Fast till Noon', color: '#EA580C', bg: '#FFEDD5' };
      case 'sunset':
        return { label: 'Fast till Sunset', color: '#EA580C', bg: '#FFEDD5' };
      case 'dusk':
        return { label: 'Fast till Dusk', color: '#B45309', bg: '#FEF3C7' };
      case 'moonrise':
        return { label: 'Fast till Moonrise', color: '#7C3AED', bg: '#EDE9FE' };
      case 'midnight':
        return { label: 'Fast till Midnight', color: '#4338CA', bg: '#E0E7FF' };
      default:
        return null;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="calendar" size={18} color="#D97706" />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.thickColor }]}>Vaishnava Calendar</Text>
            <View style={styles.zoneRow}>
              <Ionicons name="location-sharp" size={11} color="#059669" />
              <Text style={styles.zoneText}>Pune Zone (IST)</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.expandBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={[styles.expandText, { color: theme.thickColor }]}>
            {isExpanded ? 'Hide' : 'Upcoming'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.thickColor}
          />
        </TouchableOpacity>
      </View>

      {/* Today's Special Event (if any) */}
      {todayEvent ? (
        <View style={[styles.highlightBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <View style={styles.highlightHeader}>
            <Text style={styles.highlightBadge}>TODAY'S SPECIAL</Text>
            {getFastingBadge(todayEvent.fasting) && (
              <View
                style={[
                  styles.fastingPill,
                  { backgroundColor: getFastingBadge(todayEvent.fasting)!.bg },
                ]}
              >
                <Text
                  style={[
                    styles.fastingText,
                    { color: getFastingBadge(todayEvent.fasting)!.color },
                  ]}
                >
                  {getFastingBadge(todayEvent.fasting)!.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.highlightName}>{todayEvent.name}</Text>
          {todayEvent.description && (
            <Text style={styles.highlightDesc}>{todayEvent.description}</Text>
          )}
          {todayEvent.paranTime && (
            <View style={styles.paranRow}>
              <Ionicons name="time-outline" size={13} color="#92400E" />
              <Text style={styles.paranText}>Paran Time (Pune): {todayEvent.paranTime}</Text>
            </View>
          )}
        </View>
      ) : nextEkadashi ? (
        /* Next Ekadashi Quick View */
        <View style={[styles.ekadashiRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.ekadashiLeft}>
            <Text style={styles.ekadashiTag}>NEXT EKADASHI</Text>
            <Text style={[styles.ekadashiName, { color: theme.colors.text }]}>
              {nextEkadashi.name}
            </Text>
            {nextEkadashi.paranTime && (
              <Text style={[styles.ekadashiSub, { color: theme.colors.textMuted }]}>
                Paran (Pune): {nextEkadashi.paranTime}
              </Text>
            )}
          </View>
          <View style={styles.ekadashiDateBox}>
            <Text style={styles.ekadashiDateText}>{formatShortDate(nextEkadashi.date)}</Text>
            <Text style={styles.ekadashiFastingText}>No Grains</Text>
          </View>
        </View>
      ) : null}

      {/* Expanded Upcoming Events List */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
            Upcoming in Pune Zone (Next 3 Weeks)
          </Text>
          {upcomingEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              No major fasting days in the next 3 weeks.
            </Text>
          ) : (
            upcomingEvents.map((event, idx) => {
              const fasting = getFastingBadge(event.fasting);
              const isEkadashi = event.type === 'ekadashi';
              return (
                <View
                  key={`${event.date}_${idx}`}
                  style={[
                    styles.eventItem,
                    {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: idx === upcomingEvents.length - 1 ? 0 : 0.8,
                    },
                  ]}
                >
                  <View style={styles.eventDateCol}>
                    <Text style={[styles.itemDate, { color: theme.colors.text }]}>
                      {formatShortDate(event.date)}
                    </Text>
                    {isEkadashi && <Text style={styles.itemEkadashiLabel}>Ekadashi</Text>}
                  </View>

                  <View style={styles.eventInfoCol}>
                    <Text style={[styles.itemName, { color: theme.colors.text }]}>
                      {event.name}
                    </Text>
                    {event.description ? (
                      <Text
                        style={[styles.itemDesc, { color: theme.colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {event.description}
                      </Text>
                    ) : null}
                    {event.paranTime && (
                      <Text style={styles.itemParan}>Paran: {event.paranTime}</Text>
                    )}
                  </View>

                  {fasting && (
                    <View style={[styles.itemBadge, { backgroundColor: fasting.bg }]}>
                      <Text style={[styles.itemBadgeText, { color: fasting.color }]}>
                        {fasting.label}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  zoneText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  expandText: {
    fontSize: 11,
    fontWeight: '700',
  },
  highlightBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  highlightBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  fastingPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  highlightName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2,
  },
  highlightDesc: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  paranRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.6,
    borderTopColor: '#FDE68A',
  },
  paranText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  ekadashiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.8,
  },
  ekadashiLeft: {
    flex: 1,
    marginRight: 8,
  },
  ekadashiTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  ekadashiName: {
    fontSize: 13,
    fontWeight: '700',
  },
  ekadashiSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  ekadashiDateBox: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  ekadashiDateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  ekadashiFastingText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#B45309',
  },
  expandedSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.8,
    borderTopColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  eventDateCol: {
    width: 60,
  },
  itemDate: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  itemEkadashiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  eventInfoCol: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  itemParan: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
