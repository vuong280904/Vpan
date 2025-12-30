import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
    full: { flex: 1, backgroundColor: '#0b1220' },
    header: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 10 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: '#94a3b8', marginTop: 6, fontSize: 13 },
    backButton: {
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
    },
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#9ca3af', marginTop: 12 },

    progressRow: { marginBottom: 12 },
    progressBarBg: { height: 10, backgroundColor: '#111827', borderRadius: 999, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#3b82f6' },
    progressLabel: { marginTop: 8, color: '#cbd5e1', fontSize: 13, fontWeight: '600' },

    card: { backgroundColor: '#0f1724', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1f2a3a' },
    sentenceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    sentenceNumber: { color: '#93c5fd', fontWeight: '700' },
    sentenceLength: { color: '#64748b', fontSize: 12 },

    sentenceText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 34, textAlign: 'center' },
    rubyText: { color: '#60a5fa', fontSize: 16, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

    sampleBtn: { marginVertical: 12, alignItems: 'center' },
    sampleBtnText: { color: '#3b82f6', fontSize: 16, fontWeight: '700' },

    waveformPlaceholder: { height: 56, borderRadius: 8, borderWidth: 1, borderColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: '#071023' },
    waveformText: { color: '#94a3b8', fontSize: 14 },

    actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bigBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, minWidth: 160, alignItems: 'center' },
    btnRecord: { backgroundColor: '#ef4444' },
    btnStop: { backgroundColor: '#f97316' },
    bigBtnText: { color: '#fff', fontWeight: '800' },

    rightColumn: { alignItems: 'flex-end' },
    smallBtn: { marginBottom: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' },
    btnSubmit: { backgroundColor: '#10b981' },
    smallBtnText: { color: '#fff', fontWeight: '700' },
    disabled: { opacity: 0.45 },

    statusText: { marginTop: 16, color: '#9aa4b2', fontSize: 13, textAlign: 'center' },

    totalBox: { marginTop: 18, alignItems: 'center' },
    totalLabel: { color: '#94a3b8', fontSize: 13 },
    totalValue: { color: '#60a5fa', fontSize: 24, fontWeight: '900', marginTop: 6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.7)', justifyContent: 'center', alignItems: 'center', padding: 18 },
    modalCard: { width: '90%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, padding: 22, alignItems: 'center', position: 'relative' },
    modalDecor: { width: 600, height: 240, position: 'absolute', top: -120 },
    modalTitle: { fontSize: 20, fontWeight: '900', marginTop: 40, color: '#0b1220' },
    modalSubtitle: { color: '#475569', marginTop: 6 },
    modalScore: { fontSize: 26, fontWeight: '900', color: '#b45309', marginTop: 10 },
    modalErrors: { marginTop: 10, color: '#334155', textAlign: 'center', fontSize: 15 },
    modalOk: { marginTop: 18, backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 10 },
    modalClose: { backgroundColor: '#10b981' },
    modalOkText: { color: '#fff', fontWeight: '800' },
});