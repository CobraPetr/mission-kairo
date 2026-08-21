import { Redirect, Tabs } from 'expo-router';
import { Award, BarChart3, CircleDot, Map, UserRound } from 'lucide-react-native';

import { colors, fontFamilies, layout } from '@/theme/tokens';
import { useAuth } from '@/features/auth/auth-provider';

export default function AppTabsLayout() {
  const { status } = useAuth();

  if (status === 'loading') return null;
  if (status === 'guest') return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontFamily: fontFamilies.monoMedium,
          fontSize: 9,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
        },
        tabBarStyle: {
          height: layout.tabBarHeight,
          paddingTop: 9,
          paddingBottom: 10,
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarAccessibilityLabel: 'Today missions',
          tabBarIcon: ({ color, size }) => (
            <CircleDot color={color} size={size} strokeWidth={1.7} />
          ),
          title: 'Today',
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          tabBarAccessibilityLabel: 'Ninety day roadmap',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} strokeWidth={1.7} />,
          title: 'Roadmap',
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          tabBarAccessibilityLabel: 'Challenges',
          tabBarIcon: ({ color, size }) => <Award color={color} size={size} strokeWidth={1.7} />,
          title: 'Challenges',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarAccessibilityLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} strokeWidth={1.7} />
          ),
          title: 'Progress',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} strokeWidth={1.7} />
          ),
          title: 'Profile',
        }}
      />
      <Tabs.Screen name="mission" options={{ href: null }} />
      <Tabs.Screen name="ui-lab" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}
