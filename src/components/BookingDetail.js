'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';

const statusLabels = { pending: 'รอการยืนยัน', quote: 'ประเมินราคา', awaiting_payment: 'รอชำระเงิน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' };
const promptPayNumber = '0612163450';

const crc16 = (value) => {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
};

const createPromptPayPayload = (amount) => {
  const target = `0066${promptPayNumber.slice(1)}`;
  const merchantAccount = `0016A00000067701011101${String(target.length).padStart(2, '0')}${target}`;
  const amountText = Number(amount).toFixed(2);
  const amountField = `54${String(amountText.length).padStart(2, '0')}${amountText}`;
  const payloadWithoutCrc = `00020101021229${String(merchantAccount.length).padStart(2, '0')}${merchantAccount}53037645802TH${amountField}6304`;
  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
};

export default function BookingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [paymentQrCode, setPaymentQrCode] = useState('');
  const [slipMessage, setSlipMessage] = useState('');

  useEffect(() => {
    const loadBooking = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);
      let bookingQuery = supabase.from('bookings').select('*').eq('id', id);
      if (!admin) bookingQuery = bookingQuery.eq('user_id', userData.user.id);
      const { data, error: queryError } = await bookingQuery.single();
      if (queryError) setError('ไม่พบรายการจองนี้');
      setBooking(data);
    };
    if (id) loadBooking();
  }, [id, router]);

  useEffect(() => {
    const amount = Number(booking?.admin_price);
    if (booking?.status !== 'awaiting_payment' || !Number.isFinite(amount) || amount <= 0) return undefined;
    let isCurrent = true;
    QRCode.toDataURL(createPromptPayPayload(amount), { width: 240, margin: 2 })
      .then((dataUrl) => { if (isCurrent) setPaymentQrCode(dataUrl); })
      .catch(() => { if (isCurrent) setPaymentQrCode(''); });
    return () => { isCurrent = false; };
  }, [booking?.admin_price, booking?.status]);

  if (error) return <main className="auth-status"><div><p>{error}</p><Link href={isAdmin ? '/admin' : '/bookings'} className="back-login">กลับไปหน้ารายการ</Link></div></main>;
  if (!booking) return <main className="auth-status"><p>กำลังโหลดรายละเอียด...</p></main>;

  const cancelBooking = async () => {
    if (!window.confirm('ต้องการยกเลิกรายการจองนี้หรือไม่?')) return;
    setIsCancelling(true);
    const { error: cancelError } = await supabase.from('bookings').delete().eq('id', booking.id).eq('status', 'pending');
    if (cancelError) setError(cancelError.message);
    else router.replace(isAdmin ? '/admin' : '/bookings');
    setIsCancelling(false);
  };

  const uploadPaymentSlip = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSlipMessage('');
    if (!file.type.startsWith('image/')) {
      setSlipMessage('กรุณาแนบไฟล์รูปภาพสลิปการโอนเงิน');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSlipMessage('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }
    setIsUploadingSlip(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSlipMessage('ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      setIsUploadingSlip(false);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${booking.user_id}/${booking.id}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('payment-slips').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      setSlipMessage(`อัปโหลดไม่สำเร็จ: ${uploadError.message}`);
      setIsUploadingSlip(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('payment-slips').getPublicUrl(path);
    let updateQuery = supabase.from('bookings').update({ payment_slip_url: publicUrlData.publicUrl }).eq('id', booking.id).eq('status', 'awaiting_payment');
    if (!isAdmin) updateQuery = updateQuery.eq('user_id', userData.user.id);
    const { data: updatedBooking, error: updateError } = await updateQuery.select('payment_slip_url').maybeSingle();
    if (updateError) setSlipMessage(`บันทึกสลิปไม่สำเร็จ: ${updateError.message}`);
    else if (!updatedBooking) setSlipMessage('บันทึกสลิปไม่สำเร็จ กรุณารัน schema.sql ล่าสุดบน Supabase แล้วลองใหม่');
    else {
      setBooking((currentBooking) => ({ ...currentBooking, payment_slip_url: updatedBooking.payment_slip_url }));
      setSlipMessage('แนบสลิปเรียบร้อยแล้ว');
    }
    setIsUploadingSlip(false);
  };

  return <main className="booking-page account-page"><header className="booking-header"><div className="booking-brand"><span className="brand-shield"><span className="brand-roof" /></span><span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span></div><Link href={isAdmin ? '/admin' : '/bookings'} className="header-back">{isAdmin ? 'Admin' : 'รายการจอง'}</Link></header><section className="account-content"><Link href={isAdmin ? '/admin' : '/bookings'} className="back-step">← ย้อนกลับ</Link><h1>รายละเอียดการจอง</h1><p className="account-subtitle">หมายเลขออเดอร์ {booking.order_number}</p><article className="detail-card"><div className="history-card-top"><strong>{booking.service_name}</strong><span className={`status-badge status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span></div><div className="booking-details-grid"><div><small>วันที่เข้าประเมินสถานที่</small><strong>{booking.site_visit_date || '-'}</strong></div><div><small>วันที่เข้าทำความสะอาด</small><strong>{booking.service_date || 'รอแอดมินกำหนด'}</strong></div><div><small>วิธีชำระเงิน</small><strong>{booking.payment_method === 'cash' ? 'เงินสด' : 'QR Code'}</strong></div><div><small>ราคาประเมินจากบริการ</small><strong>{booking.service_price}</strong></div><div><small>ราคาที่แอดมินกำหนด</small><strong>{booking.admin_price != null ? `${Number(booking.admin_price).toLocaleString('th-TH')} บาท` : 'รอประเมินราคา'}</strong></div><div><small>ชื่อผู้จอง</small><strong>{booking.customer_name}</strong></div><div><small>เบอร์โทรศัพท์</small><strong>{booking.customer_phone}</strong></div><div className="full-detail"><small>อีเมล</small><strong>{booking.customer_email || '-'}</strong></div><div className="full-detail"><small>ที่อยู่ให้บริการ</small><strong>{booking.service_address}</strong></div></div></article>{booking.status === 'awaiting_payment' && <section className="payment-slip-panel"><strong>ชำระเงินตามราคาประเมิน</strong><p>พร้อมเพย์ 0612163450 ยอด {booking.admin_price != null ? `${Number(booking.admin_price).toLocaleString('th-TH')} บาท` : 'รอแอดมินกำหนดยอด'}</p>{paymentQrCode && <img className="payment-qr-code" src={paymentQrCode} alt={`QR พร้อมเพย์ ยอด ${booking.admin_price} บาท`} />}{!paymentQrCode && <p>ยังสร้าง QR ไม่ได้ กรุณารอแอดมินกำหนดราคา</p>}<label className="slip-upload-label"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPaymentSlip} disabled={isUploadingSlip} />{isUploadingSlip ? 'กำลังอัปโหลด...' : 'แนบสลิปการโอนเงิน'}</label>{slipMessage && <p className="slip-message">{slipMessage}</p>}{booking.payment_slip_url && <a href={booking.payment_slip_url} target="_blank" rel="noreferrer">ดูสลิปที่แนบไว้</a>}</section>}{isAdmin && booking.payment_slip_url && <p className="payment-slip-link"><a href={booking.payment_slip_url} target="_blank" rel="noreferrer">เปิดดูสลิปการชำระเงิน</a></p>}{!isAdmin && booking.status === 'pending' && <button type="button" className="cancel-detail-button" disabled={isCancelling} onClick={cancelBooking}>{isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}</button>}</section></main>;
}