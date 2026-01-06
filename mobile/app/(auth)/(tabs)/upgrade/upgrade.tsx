import { router } from 'expo-router';
import { ArrowLeft, Banknote, Bitcoin, Check, Crown, Info, Sparkles, XCircle, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';

import { PublicKey } from '@solana/web3.js';
import * as Crypto from 'expo-crypto';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.23;
const IS_TEST = true;

const API_URL = Platform.OS === "web" 
    ? "https://vpan-api.onrender.com/api/auth"
    : "http://172.20.10.3:5000/api/auth";

const MERCHANT_WALLET = new PublicKey('9rZttxsDzghUFkuZ7FxYYnSFzi2TcYU46yr5pStfJr2m');

// Thông tin ngân hàng
const BANK_ACCOUNT = '104876837266';
const BANK_NAME = 'VietinBank';

interface Plan {
    id: string;
    name: string;
    subtitle: string;
    price: number;
    interval?: string;
    popular?: boolean;
    features: string[];
    color: string;
    gradient: string[];
    icon: any;
}

const PLANS: Plan[] = [
    // ... (giữ nguyên như cũ)
    {
        id: 'pro',
        name: 'Gói Pro',
        subtitle: 'Nâng trình lên N3',
        price: 9.99,
        interval: 'tháng',
        color: '#8b5cf6',
        gradient: ['#a78bfa', '#8b5cf6'],
        icon: Zap,
        features: [
            '+30 Chủ đề Shadowing N3',
            'Mở khóa kho sách song ngữ trung cấp',
            'Luyện thi JLPT N3',
            'Lưu 500 flashcard',
            'Tăng tốc từ nền tảng N5–N4 miễn phí',
        ],
    },
    {
        id: 'premium',
        name: 'Gói Premium',
        subtitle: 'Sẵn sàng chạm tới N2',
        price: 99.99,
        interval: 'năm',
        popular: true,
        color: '#f59e0b',
        gradient: ['#fbbf24', '#f59e0b'],
        icon: Crown,
        features: [
            '+50 Chủ đề Shadowing N2 & Business',
            'Mở khóa kho sách nâng cao + bài báo',
            'Đề thi JLPT N3–N2',
            'Lưu 2.000 flashcard',
            'Học chuyên sâu – hiệu quả dài hạn',
        ],
    },
    {
        id: 'master',
        name: 'Gói Master',
        subtitle: 'Chinh phục N1',
        price: 119.99,
        color: '#06b6d4',
        gradient: ['#22d3ee', '#06b6d4'],
        icon: Sparkles,
        features: [
            '+100 Chủ đề Shadowing N1 nâng cao',
            'Sách học thuật & chuyên ngành',
            'Đề thi JLPT N1 chính thức',
            'Lưu 5.000 flashcard',
            'Dành cho mục tiêu cao nhất',
        ],
    },
    {
        id: 'lifetime',
        name: 'Gói Lifetime',
        subtitle: 'Mở khóa trọn đời',
        price: 159.99,
        color: '#ec4899',
        gradient: ['#f43f5e', '#ec4899'],
        icon: Bitcoin,
        features: [
            'Tất cả nội dung Pro + Premium + Master',
            'Cập nhật mới hàng tháng mãi mãi',
            'Flashcard không giới hạn',
            'Badge VIP + sticker độc quyền',
            'Mua 1 lần – học mãi mãi',
        ],
    },
];

export default function UpgradeScreen() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [infoModal, setInfoModal] = useState(false);
    const [infoTitle, setInfoTitle] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [infoType, setInfoType] = useState<'success' | 'error' | 'info'>('info'); // để đổi icon & màu

    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [qrCode, setQrCode] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [reference, setReference] = useState('');
    const [payAddress, setPayAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'bank'>('crypto');

    const USD_TO_SOL_RATE = 0.0079;

    // ==========================
    // MODAL THÔNG BÁO CHUNG
    // ==========================
    const showInfo = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setInfoTitle(title);
        setInfoMessage(message);
        setInfoType(type);
        setInfoModal(true);
    };

    // ==========================
    // CRYPTO PAYMENT
    // ==========================
    const buildSolanaPayURL = ({ recipient, amount, reference, label, message }: any) => {
        const params = new URLSearchParams({
            amount,
            reference: reference.toBase58(),
            cluster: 'devnet',
        });
        if (label) params.append('label', label);
        if (message) params.append('message', message);
        params.append('memo', reference.toBase58());
        return `solana:${recipient.toBase58()}?${params.toString()}`;
    };

    const createCryptoPayment = async (plan: Plan) => {
        setLoading(true);
        setPaymentMethod('crypto');

        try {
            let ref: PublicKey | null = null;
            let attempts = 0;
            while (attempts < 20 && !ref) {
                const randomBytes = await Crypto.getRandomBytesAsync(32);
                try { ref = new PublicKey(randomBytes); } catch { attempts++; }
            }
            if (!ref) throw new Error('Không thể tạo reference');

            let amountInSol = (plan.price * USD_TO_SOL_RATE).toFixed(6);

            const url = buildSolanaPayURL({
                recipient: MERCHANT_WALLET,
                amount: amountInSol,
                reference: ref,
                label: 'Vpan Upgrade',
                message: `${plan.name} - ${user?.email || 'User'}`,
            });

            const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=' + encodeURIComponent(url);

            setSelectedPlan(plan);
            setPayAmount(`${amountInSol} SOL`);
            setReference(ref.toBase58());
            setPayAddress(MERCHANT_WALLET.toBase58());
            setQrCode(qr);
            setPaymentModal(true);
        } catch (error: any) {
            showInfo('Lỗi thanh toán Crypto', error.message || 'Không thể tạo hóa đơn crypto', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ==========================
    // BANK PAYMENT
    // ==========================
    const createBankPayment = async (plan: Plan) => {
        setLoading(true);
        setPaymentMethod('bank');

        try {
            const randomBytes = await Crypto.getRandomBytesAsync(16);
            const ref = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase()
                .slice(0, 12);

            let amountVND: number;
            if (IS_TEST) {
                switch (plan.id) {
                    case 'pro': amountVND = 5000; break;
                    case 'premium': amountVND = 10000; break;
                    case 'master': amountVND = 15000; break;
                    case 'lifetime': amountVND = 20000; break;
                    default: amountVND = 5000;
                }
            } else {
                amountVND = Math.round(plan.price * 25000);
            }

            const description = `VPAN ${plan.id.toUpperCase()} ${user?.id || 'USER'} REF${ref}`;

            const qrUrl = `https://qr.sepay.vn/img?acc=${BANK_ACCOUNT}&bank=${encodeURIComponent(BANK_NAME)}&amount=${amountVND}&des=${encodeURIComponent(description)}`;

            setSelectedPlan(plan);
            setPayAmount(`${amountVND.toLocaleString()} VNĐ`);
            setReference(ref);
            setPayAddress(`STK: ${BANK_ACCOUNT}\n${BANK_NAME}`);
            setQrCode(qrUrl);
            setPaymentModal(true);

            // Hướng dẫn chi tiết bằng modal đẹp
            showInfo(
                'Hướng dẫn chuyển khoản',
                `Vui lòng chuyển khoản chính xác:\n\n• Số tiền: ${amountVND.toLocaleString()} VNĐ\n• Nội dung: ${description}\n\nSau khi chuyển xong, admin sẽ kích hoạt gói cho bạn trong vòng vài phút đến 1 giờ.\n\nCảm ơn bạn đã ủng hộ Vpan! ❤️`,
                'info'
            );
        } catch (error: any) {
            showInfo('Lỗi', 'Không thể tạo QR chuyển khoản ngân hàng', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ==========================
    // VERIFY CRYPTO
    // ==========================
    const verifyPayment = async () => {
        if (paymentMethod !== 'crypto' || !reference || !selectedPlan) return;

        try {
            const res = await fetch(`${API_URL}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference,
                    userId: user?.id,
                    planId: selectedPlan.id,
                    amount: Number(payAmount.split(' ')[0]),
                })
            });

            const data = await res.json();
            if (data.paid) {
                showInfo('🎉 Thanh toán thành công!', 'Gói của bạn đã được kích hoạt.\nChúc bạn học tiếng Nhật thật vui!', 'success');
                setPaymentModal(false);
                setTimeout(() => router.back(), 2000);
            }
        } catch (e) {
            console.log('Verify error:', e);
        }
    };

    useEffect(() => {
        if (!paymentModal || paymentMethod !== 'crypto' || !reference) return;
        const timer = setInterval(verifyPayment, 5000);
        return () => clearInterval(timer);
    }, [paymentModal, reference, paymentMethod]);

    return (
        <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
            {/* ... PHẦN SCROLLVIEW VÀ CARD GÓI GIỮ NGUYÊN NHƯ TRƯỚC ... */}
            <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
                    <ArrowLeft color="#fff" size={28} />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginBottom: 40 }}>
                    <Crown color="#f59e0b" size={80} />
                    <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 20 }}>
                        Nâng cấp Vpan
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 18, textAlign: 'center', marginTop: 12 }}>
                        Chọn gói phù hợp – chinh phục tiếng Nhật nhanh hơn bao giờ hết
                    </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={CARD_WIDTH + 20} snapToAlignment="center" contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        return (
                            <View key={plan.id} style={{
                                width: CARD_WIDTH,
                                marginHorizontal: 10,
                                backgroundColor: '#1e293b',
                                borderRadius: 24,
                                padding: 24,
                                borderWidth: plan.popular ? 4 : 0,
                                borderColor: plan.popular ? plan.color : 'transparent',
                                position: 'relative',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.3,
                                shadowRadius: 20,
                                elevation: 10,
                            }}>
                                                                {plan.popular && (
                                    <View style={{ position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: plan.color, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>TIẾT KIỆM NHẤT</Text>
                                    </View>
                                )}

                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ backgroundColor: plan.color + '22', padding: 16, borderRadius: 20, marginBottom: 12 }}>
                                        <Icon color={plan.color} size={36} />
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{plan.name}</Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 4 }}>{plan.subtitle}</Text>
                                </View>

                                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                                    <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>${plan.price}</Text>
                                    {plan.interval && <Text style={{ color: '#64748b' }}>/ {plan.interval}</Text>}
                                    {plan.id === 'lifetime' && <Text style={{ color: '#ec4899', fontWeight: 'bold', marginTop: 8 }}>MỘT LẦN DUY NHẤT</Text>}
                                </View>

                                <View style={{ gap: 12, marginTop: 8 }}>
                                    {plan.features.map((feature, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                            <Check color="#4ade80" size={20} style={{ marginTop: 2 }} />
                                            <Text style={{ color: '#e2e8f0', fontSize: 15, flex: 1, lineHeight: 22 }}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={{ marginTop: 24, gap: 12 }}>
                                    <TouchableOpacity
                                        onPress={() => createCryptoPayment(plan)}
                                        style={{ backgroundColor: '#f59e0b', paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                                        <Bitcoin color="#000" size={20} />
                                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>Thanh toán Crypto</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => createBankPayment(plan)}
                                        style={{ backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                                        <Banknote color="#fff" size={20} />
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Chuyển khoản Ngân hàng</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                <Text style={{ color: '#64748b', textAlign: 'center', marginVertical: 40, fontSize: 13 }}>
                    Thanh toán an toàn • Crypto hoặc Chuyển khoản ngân hàng (VNĐ)
                </Text>
            </ScrollView>

            {/* MODAL THANH TOÁN */}
            <Modal visible={paymentModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <TouchableOpacity onPress={() => setPaymentModal(false)} style={{ position: 'absolute', top: 50, right: 20, backgroundColor: '#333', padding: 10, borderRadius: 50 }}>
                        <Text style={{ color: '#fff', fontSize: 24 }}>×</Text>
                    </TouchableOpacity>

                    <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
                        Thanh toán {selectedPlan?.name}
                    </Text>

                    <Text style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>
                        {paymentMethod === 'bank' ? 'Chuyển khoản ngân hàng' : 'Crypto (Solana)'}
                    </Text>

                    <Image source={{ uri: qrCode }} style={{ width: 300, height: 300, borderRadius: 20, marginVertical: 20 }} resizeMode="contain" />

                    <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 10 }}>
                        Số tiền: <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>{payAmount}</Text>
                    </Text>

                    <Text selectable selectionColor="#f59e0b" style={{
                        backgroundColor: '#111', color: '#f59e0b', padding: 16, borderRadius: 12, fontSize: 15, textAlign: 'center', fontFamily: 'monospace', marginBottom: 20
                    }}>
                        {payAddress}
                    </Text>

                    {paymentMethod === 'bank' && (
                        <View style={{ backgroundColor: '#1e293b', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>Nội dung chuyển khoản:</Text>
                            <Text selectable style={{ color: '#10b981', fontSize: 16, fontFamily: 'monospace' }}>
                                VPAN {selectedPlan?.id.toUpperCase()} {user?.id || 'USER'} REF{reference}
                            </Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* MODAL THÔNG BÁO ĐẸP */}
            <Modal visible={infoModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
                        {infoType === 'success' && <Check color="#4ade80" size={60} />}
                        {infoType === 'error' && <XCircle color="#ef4444" size={60} />}
                        {infoType === 'info' && <Info color="#3b82f6" size={60} />}

                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
                            {infoTitle}
                        </Text>

                        <Text style={{ color: '#e2e8f0', fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
                            {infoMessage}
                        </Text>

                        <TouchableOpacity
                            onPress={() => setInfoModal(false)}
                            style={{ backgroundColor: infoType === 'error' ? '#ef4444' : '#f59e0b', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, marginTop: 24 }}>
                            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* LOADING */}
            {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                    <View style={{ backgroundColor: '#1e293b', padding: 32, borderRadius: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#f59e0b" />
                        <Text style={{ color: '#fff', marginTop: 20, fontSize: 18, fontWeight: '600' }}>Đang tạo hóa đơn...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}
