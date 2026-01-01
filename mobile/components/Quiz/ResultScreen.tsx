import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Award, Clock, RotateCcw, Share2, Target, Trophy, Zap } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

type Props = {
  score: number;
  total: number;
  timeUsed?: number;
  mode: 'timed' | 'speed';
  setId: string;
};

export default function ResultScreen({
  score,
  total,
  timeUsed,
  mode,
  setId,
}: Props) {
  const accuracy = Math.round((score / total) * 100);
  const isPerfect = score === total;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rank =
    accuracy >= 98 ? 'SS' :
      accuracy >= 95 ? 'S+' :
        accuracy >= 90 ? 'S' :
          accuracy >= 80 ? 'A' :
            accuracy >= 70 ? 'B' : 'C';

  const rankColor: [string, string, string] =
    accuracy >= 95 ? ['#fbbf24', '#f59e0b', '#d97706'] :
      accuracy >= 90 ? ['#a78bfa', '#8b5cf6', '#7c3aed'] :
        accuracy >= 80 ? ['#60a5fa', '#3b82f6', '#2563eb'] :
          accuracy >= 70 ? ['#34d399', '#10b981', '#059669'] :
            ['#f87171', '#ef4444', '#dc2626'];

  const title =
    accuracy >= 95 ? 'Hoàn hảo!' :
      accuracy >= 90 ? 'Xuất sắc!' :
        accuracy >= 70 ? 'Rất tốt!' :
          'Cố lên!';

  const subtitle =
    accuracy >= 95 ? 'Bạn là thiên tài! 🌟' :
      accuracy >= 90 ? 'Kết quả tuyệt vời! 🎯' :
        accuracy >= 70 ? 'Tiến bộ rõ rệt! 💪' :
          'Cố gắng lần sau nhé! 📚';

  const onShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `🔥 Tôi đạt ${score}/${total} (${accuracy}%) - Rank ${rank} trong ${mode === 'timed' ? 'Timed Test' : 'Speed Run'
        } trên Vpan! Bạn có làm được không? 🎯`,
    });
  };

  const replayQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Lấy lại questionCount từ lần trước
    // Vì total hiện tại chính là số câu đã làm lần trước
    const previousQuestionCount = total;

    router.push({
      pathname: `/(auth)/(quiz)/${mode}/[setId]`,
      params: {
        setId,
        questionCount: previousQuestionCount.toString(),  // ← THÊM DÒNG NÀY – QUAN TRỌNG!
        reset: Date.now().toString(),
      },
    } as any);
  };

  const goHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Animated background gradient */}
      <LinearGradient
        colors={['#0f172a', '#1e1b4b', '#1e293b']}
        style={StyleSheet.absoluteFill}
      />

      {isPerfect && <ConfettiCannon count={300} origin={{ x: width / 2, y: 0 }} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animated Hero Section */}
        <Animated.View
          style={[
            styles.heroContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={rankColor}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative circles */}
            <View style={styles.circleDecor1} />
            <View style={styles.circleDecor2} />

            <View style={styles.trophyContainer}>
              <View style={styles.trophyGlow} />
              <Trophy size={moderateScale(50)} color="#fff" strokeWidth={2.5} />
            </View>

            <View style={styles.rankBadge}>
              <Text style={styles.rank}>{rank}</Text>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Accuracy Circle */}
            <View style={styles.accuracyCircle}>
              <Text style={styles.accuracyValue}>{accuracy}%</Text>
              <Text style={styles.accuracyLabel}>Chính xác</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Animated Stats Grid */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <StatCard
            icon={<Target size={moderateScale(20)} color="#3b82f6" />}
            label="Điểm số"
            value={`${score}/${total}`}
            gradient={['#1e3a8a', '#1e40af'] as [string, string]}
          />
          <StatCard
            icon={<Award size={moderateScale(20)} color="#f59e0b" />}
            label="Xếp hạng"
            value={rank}
            gradient={['#78350f', '#92400e'] as [string, string]}
          />
          <StatCard
            icon={<Clock size={moderateScale(20)} color="#10b981" />}
            label="Thời gian"
            value={
              timeUsed !== undefined
                ? `${Math.floor(timeUsed / 60)}:${(timeUsed % 60)
                  .toString()
                  .padStart(2, '0')}`
                : '--'
            }
            gradient={['#064e3b', '#065f46'] as [string, string]}
          />
          <StatCard
            icon={<Zap size={moderateScale(20)} color="#8b5cf6" />}
            label="Chế độ"
            value={mode === 'timed' ? 'Timed' : 'Speed'}
            gradient={['#581c87', '#6b21a8'] as [string, string]}
          />
        </Animated.View>

        {/* Performance Bar */}
        <Animated.View
          style={[
            styles.performanceSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.performanceTitle}>Phân tích kết quả</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={rankColor}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${accuracy}%` }]}
              />
            </View>
          </View>

          <View style={styles.performanceStats}>
            <PerformanceItem
              label="Đúng"
              value={score}
              color="#22c55e"
            />
            <PerformanceItem
              label="Sai"
              value={total - score}
              color="#ef4444"
            />
            <PerformanceItem
              label="Tổng"
              value={total}
              color="#64748b"
            />
          </View>
        </Animated.View>

        <View style={{ height: verticalScale(20) }} />

        {/* Action Buttons - Nằm ở cuối */}
        <View style={styles.actionContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={replayQuiz}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a'] as [string, string]}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <RotateCcw size={moderateScale(18)} color="#fff" />
                <Text style={styles.btnText}>Làm lại</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onShare}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed'] as [string, string]}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Share2 size={moderateScale(18)} color="#fff" />
                <Text style={styles.btnText}>Chia sẻ</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryBtn}
              onPress={goHome}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#475569', '#334155'] as [string, string]}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ArrowLeft size={moderateScale(18)} color="#fff" />
                <Text style={styles.btnText}>Trang chủ</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: verticalScale(20) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== SUB COMPONENTS ===== */
function StatCard({
  icon,
  label,
  value,
  gradient
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: [string, string];
}) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={gradient}
        style={styles.statCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIconContainer}>
          {icon}
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </LinearGradient>
    </View>
  );
}

function PerformanceItem({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.performanceItem}>
      <View style={[styles.performanceDot, { backgroundColor: color }]} />
      <Text style={styles.performanceLabel}>{label}</Text>
      <Text style={styles.performanceValue}>{value}</Text>
    </View>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  scrollContent: {
    padding: scale(16),
    paddingTop: verticalScale(24),
  },

  heroContainer: {
    marginBottom: verticalScale(24),
  },

  hero: {
    borderRadius: moderateScale(32),
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },

  circleDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  circleDecor2: {
    position: 'absolute',
    bottom: -25,
    left: -25,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  trophyContainer: {
    position: 'relative',
    marginBottom: verticalScale(10),
  },

  trophyGlow: {
    position: 'absolute',
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: '50%',
    left: '50%',
    marginLeft: moderateScale(-28),
    marginTop: moderateScale(-28),
  },

  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(14),
    marginBottom: verticalScale(8),
  },

  rank: {
    fontSize: moderateScale(32),
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  title: {
    fontSize: moderateScale(22),
    color: '#fff',
    fontWeight: '900',
    marginBottom: verticalScale(2),
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  subtitle: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: verticalScale(12),
  },

  accuracyCircle: {
    width: moderateScale(85),
    height: moderateScale(85),
    borderRadius: moderateScale(42.5),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  accuracyValue: {
    fontSize: moderateScale(26),
    fontWeight: '900',
    color: '#fff',
  },

  accuracyLabel: {
    fontSize: moderateScale(10),
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(16),
  },

  statCard: {
    width: '48.5%',
    aspectRatio: 1.4,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  statCardGradient: {
    flex: 1,
    padding: scale(12),
    justifyContent: 'space-between',
  },

  statIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },

  statValue: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '900',
  },

  performanceSection: {
    backgroundColor: '#1e293b',
    borderRadius: moderateScale(18),
    padding: scale(16),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  performanceTitle: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#fff',
    marginBottom: verticalScale(12),
  },

  progressBarContainer: {
    marginBottom: verticalScale(14),
  },

  progressBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  performanceItem: {
    alignItems: 'center',
  },

  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },

  performanceLabel: {
    color: '#94a3b8',
    fontSize: moderateScale(10),
    fontWeight: '600',
    marginBottom: 2,
  },

  performanceValue: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '800',
  },

  actionContainer: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: scale(10),
  },

  primaryBtn: {
    flex: 1,
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  secondaryBtn: {
    flex: 1,
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  tertiaryBtn: {
    flex: 1,
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  btnGradient: {
    paddingVertical: verticalScale(13),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  btnText: {
    color: '#fff',
    fontSize: moderateScale(14),
    fontWeight: '800',
  },
});