import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_PALETTES, AppTheme, ThemeId } from '../constants/theme';

interface ThemeContextType {
  theme: AppTheme;
  currentThemeId: ThemeId;
  setThemeId: (id: ThemeId) => Promise<void>;
  availableThemes: AppTheme[];
  showThemePicker: boolean;
  openThemePicker: () => void;
  closeThemePicker: () => void;
}

const THEME_STORAGE_KEY = 'bhakti_active_theme_id';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentThemeId, setCurrentThemeIdState] = useState<ThemeId>('orange');
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedId && THEME_PALETTES[savedId as ThemeId]) {
          setCurrentThemeIdState(savedId as ThemeId);
        }
      } catch (e) {
        console.warn('Failed to load saved theme:', e);
      }
    };
    loadSavedTheme();
  }, []);

  const setThemeId = async (id: ThemeId) => {
    if (THEME_PALETTES[id]) {
      setCurrentThemeIdState(id);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
      } catch (e) {
        console.warn('Failed to save theme choice:', e);
      }
    }
  };

  const openThemePicker = () => setShowThemePicker(true);
  const closeThemePicker = () => setShowThemePicker(false);

  const theme = THEME_PALETTES[currentThemeId] || THEME_PALETTES.orange;
  const availableThemes = Object.values(THEME_PALETTES);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentThemeId,
        setThemeId,
        availableThemes,
        showThemePicker,
        openThemePicker,
        closeThemePicker,
      }}
    >
      {children}

      {/* Global Theme Selector Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={closeThemePicker}
      >
        <TouchableWithoutFeedback onPress={closeThemePicker}>
          <View style={pickerStyles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[pickerStyles.modalCard, { backgroundColor: theme.colors.card }]}>
                {/* Header */}
                <View style={pickerStyles.headerRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="color-palette" size={22} color={theme.colors.primary} />
                    <Text style={[pickerStyles.modalTitle, { color: theme.colors.text }]}>
                      Choose App Theme
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeThemePicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[pickerStyles.subtitle, { color: theme.colors.textMuted }]}>
                  Select your preferred devotional color scheme for your dashboard and backgrounds:
                </Text>

                <ScrollView style={pickerStyles.themeList} showsVerticalScrollIndicator={false}>
                  {availableThemes.map((item) => {
                    const isSelected = item.id === currentThemeId;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          pickerStyles.themeItem,
                          {
                            borderColor: isSelected ? item.thickColor : theme.colors.borderLight,
                            backgroundColor: isSelected ? item.liteColor : theme.colors.surface,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={async () => {
                          await setThemeId(item.id);
                          closeThemePicker();
                        }}
                      >
                        {/* Two-tone color preview swatch */}
                        <View style={pickerStyles.swatchContainer}>
                          <View style={[pickerStyles.swatchThick, { backgroundColor: item.thickColor }]} />
                          <View style={[pickerStyles.swatchLite, { backgroundColor: item.liteColor }]} />
                        </View>

                        {/* Title & Desc */}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[pickerStyles.themeName, { color: theme.colors.text }]}>
                            {item.name}
                          </Text>
                          <Text style={[pickerStyles.themeColorsLabel, { color: theme.colors.textMuted }]}>
                            {item.id === 'black' ? 'Dark Mode' : 'Thick & Lite combo'}
                          </Text>
                        </View>

                        {/* Checkmark */}
                        {isSelected && (
                          <View style={[pickerStyles.checkBadge, { backgroundColor: item.thickColor }]}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  themeList: {
    maxHeight: 380,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  swatchContainer: {
    flexDirection: 'row',
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  swatchThick: {
    flex: 1,
    height: '100%',
  },
  swatchLite: {
    flex: 1,
    height: '100%',
  },
  themeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  themeColorsLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
