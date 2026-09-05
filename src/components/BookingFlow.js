'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const services = [
  { name: 'ทำความสะอาดบ้าน', price: 'เริ่มต้น 45 บาท/ตร.ม.', featured: true },
  { name: 'ทำความสะอาดบ้านคอนโด', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
  { name: 'ทำความสะอาดสำนักงาน', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
  { name: 'Big Cleaning', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
  { name: 'ขอโปไซน์', price: 'เริ่มต้น 1,500 บาท' },
  { name: 'หลังน้ำท่วม', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
];

const timeSlots = ['08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const getToday = () => {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
};

const getSlotStartMinutes = (slot) => {
  const [hours, minutes] = slot.split(':').map(Number);
  return hours * 60 + minutes;
};

export default function BookingFlow() {
  const router = useRouter();
  const today = getToday();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(0);
  const [selectedTime, setSelectedTime] = useState(1);
  const [selectedDate, setSelectedDate] = useState(today.day);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  });
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('DP0000');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);

  const nextStep = () => setStep((currentStep) => Math.min(currentStep + 1, 4));
  const previousStep = () => setStep((currentStep) => Math.max(currentStep - 1, 1));
  const goToStep = (nextStep) => {
    if (nextStep <= step) setStep(nextStep);
  };

  const changeMonth = (offset) => {
    setCalendarMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      const isBeforeCurrentMonth = nextMonth.getFullYear() < today.year
        || (nextMonth.getFullYear() === today.year && nextMonth.getMonth() < today.month);
      if (isBeforeCurrentMonth) return currentMonth;
      setSelectedDate(nextMonth.getFullYear() === today.year && nextMonth.getMonth() === today.month ? today.day : 1);
      return nextMonth;
    });
  };

  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = `${thaiMonths[calendarMonth.getMonth()]} ${calendarMonth.getFullYear() + 543}`;
  const selectedIsoDate = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
  const selectedDateIsToday = calendarMonth.getFullYear() === today.year && calendarMonth.getMonth() === today.month && selectedDate === today.day;
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isSlotPast = (slot) => selectedDateIsToday && getSlotStartMinutes(slot) <= currentMinutes;
  const hasAvailableTime = timeSlots.some((slot) => !isSlotPast(slot));
  const isDatePast = (day) => calendarMonth.getFullYear() < today.year
    || (calendarMonth.getFullYear() === today.year && calendarMonth.getMonth() < today.month)
    || (calendarMonth.getFullYear() === today.year && calendarMonth.getMonth() === today.month && day < today.day);

  const updateCustomer = (field, value) => {
    setCustomer((currentCustomer) => ({ ...currentCustomer, [field]: value }));
  };

  const saveBooking = async (event) => {
    event.preventDefault();
    setBookingMessage('');
    if (!customer.name || !customer.phone || !customer.address) {
      setBookingMessage('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน');
      return;
    }

    if (isDatePast(selectedDate) || isSlotPast(timeSlots[selectedTime])) {
      setBookingMessage('วันหรือช่วงเวลาที่เลือกผ่านไปแล้ว กรุณาเลือกเวลาใหม่');
      return;
    }

    setIsSaving(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      router.replace('/login');
      return;
    }

    const createdOrderNumber = `DP${Date.now().toString().slice(-8)}`;
    const selectedServiceData = services[selectedService];
    const { error } = await supabase.from('bookings').insert({
      order_number: createdOrderNumber,
      user_id: userData.user.id,
      service_name: selectedServiceData.name,
      service_price: selectedServiceData.price,
      service_date: selectedIsoDate,
      time_slot: timeSlots[selectedTime],
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || userData.user.email,
      service_address: customer.address,
      status: 'pending',
    });

    setIsSaving(false);
    if (error) {
      setBookingMessage(error.message.includes('bookings')
        ? 'ยังไม่มีตาราง bookings ใน Supabase กรุณารัน SQL schema ที่ให้ไว้ใน supabase/schema.sql'
        : error.message);
      return;
    }

    setOrderNumber(createdOrderNumber);
    setStep(4);
  };

  if (isCheckingSession) {
    return <main className="auth-status"><p>กำลังตรวจสอบบัญชี...</p></main>;
  }

  return (
    <main className="booking-page">
      <header className="booking-header">
        <div className="booking-brand">
          <span className="brand-shield"><span className="brand-roof" /></span>
          <span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span>
        </div>
        <button type="button" className="menu-button" aria-label="เปิดเมนู"><span /><span /><span /></button>
      </header>

      <section className="booking-content">
        {step > 1 && <button type="button" className="back-step" onClick={previousStep}>← ย้อนกลับ</button>}
        {step === 1 && <>
          <h1>เลือกบริการ</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <div className="service-list">
            {services.map((service, index) => (
              <button type="button" className={`service-option ${selectedService === index ? 'selected' : ''}`} key={service.name} onClick={() => setSelectedService(index)}>
                <span className={`service-image service-image-${index}`} aria-hidden="true" />
                <span className="service-copy"><strong>{service.name}</strong><small>{service.price}</small></span>
                <span className="service-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button type="button" className="next-button" onClick={nextStep}>ถัดไป</button>
        </>}

        {step === 2 && <>
          <h1>เลือกวันและเวลา</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <h2 className="booking-label">เลือกวันที่ใช้บริการ</h2>
          <div className="calendar">
            <div className="calendar-heading"><button type="button" onClick={() => changeMonth(-1)} aria-label="เดือนก่อนหน้า">‹</button><strong>{monthLabel}</strong><button type="button" onClick={() => changeMonth(1)} aria-label="เดือนถัดไป">›</button></div>
            <div className="calendar-week"><span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span></div>
            <div className="calendar-days">
              {[...Array(firstDayOfMonth)].map((_, index) => <span key={`empty-${index}`} />)}
              {[...Array(daysInMonth)].map((_, index) => {
                const day = index + 1;
                return <button type="button" key={day} className={selectedDate === day ? 'selected' : ''} disabled={isDatePast(day)} onClick={() => setSelectedDate(day)}>{day}</button>;
              })}
            </div>
          </div>
          <h2 className="booking-label time-label">เลือกเวลา</h2>
          <div className="time-grid">
            {timeSlots.map((time, index) => <button type="button" key={time} className={selectedTime === index ? 'selected' : ''} disabled={isSlotPast(time)} onClick={() => setSelectedTime(index)}>{time}</button>)}
          </div>
          {!hasAvailableTime && <p className="booking-error">วันนี้ไม่มีช่วงเวลาที่เหลือแล้ว กรุณาเลือกวันถัดไป</p>}
          <button type="button" className="next-button" disabled={!hasAvailableTime || isDatePast(selectedDate) || isSlotPast(timeSlots[selectedTime])} onClick={nextStep}>ถัดไป</button>
        </>}

        {step === 3 && <>
          <h1>การจองบริการ</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <h2 className="booking-label">ข้อมูลผู้จอง</h2>
          <form className="customer-form" onSubmit={saveBooking}>
            <label htmlFor="customer-name">ชื่อ-นามสกุล <b>*</b></label>
            <input id="customer-name" placeholder="กรอกชื่อ-นามสกุล" value={customer.name} onChange={(event) => updateCustomer('name', event.target.value)} />
            <label htmlFor="customer-phone">เบอร์โทรศัพท์ <b>*</b></label>
            <input id="customer-phone" placeholder="กรอกเบอร์โทรศัพท์" value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} />
            <label htmlFor="customer-email">อีเมล</label>
            <input id="customer-email" type="email" placeholder="กรอกอีเมล (ถ้ามี)" value={customer.email} onChange={(event) => updateCustomer('email', event.target.value)} />
            <label htmlFor="customer-address">ที่อยู่สำหรับให้บริการ <b>*</b></label>
            <textarea id="customer-address" placeholder="กรอกที่อยู่" value={customer.address} onChange={(event) => updateCustomer('address', event.target.value)} />
            {bookingMessage && <p className="booking-error" role="alert">{bookingMessage}</p>}
            <button type="submit" className="next-button" disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : 'ถัดไป'}</button>
          </form>
        </>}

        {step === 4 && <>
          <h1>รายละเอียดการจอง</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <div className="booking-summary-header"><div>หมายเลขออเดอร์<br /><strong>{orderNumber}</strong></div><span>รอการยืนยัน</span></div>
          <div className="booking-summary-card">
            <div className={`summary-service-image service-image-${selectedService}`} />
            <div><strong>{services[selectedService].name}</strong><small>{services[selectedService].price}</small></div>
          </div>
          <div className="booking-details-grid">
            <div><small>วันที่ใช้บริการ</small><strong>{selectedDate} {thaiMonths[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}</strong></div>
            <div><small>ช่วงเวลา</small><strong>{timeSlots[selectedTime]} น.</strong></div>
            <div><small>ชื่อผู้จอง</small><strong>{customer.name || '-'}</strong></div>
            <div><small>เบอร์โทรศัพท์</small><strong>{customer.phone || '-'}</strong></div>
            <div className="full-detail"><small>ที่อยู่ให้บริการ</small><strong>{customer.address || '-'}</strong></div>
          </div>
          <div className="summary-actions"><button type="button" onClick={previousStep}>ยกเลิกการจอง</button><button type="button" onClick={previousStep}>แก้ไขการจอง</button></div>
        </>}
      </section>

      <nav className="booking-nav" aria-label="เมนูหลัก"><Link href="/"><span>⌂</span>หน้าแรก</Link><Link href="/booking" className="active"><span>✣</span>จองบริการ</Link><Link href="/bookings"><span>□</span>รายการจอง</Link><Link href="/profile"><span>♙</span>โปรไฟล์</Link></nav>
    </main>
  );
}

function StepIndicator({ activeStep, onStepClick }) {
  return <div className="step-indicator" aria-label={`ขั้นตอนที่ ${activeStep} จาก 4`}>{[1, 2, 3, 4].map((step) => <button type="button" key={step} className={step === activeStep ? 'active' : ''} aria-label={`ไปขั้นตอนที่ ${step}`} onClick={() => onStepClick(step)} disabled={step > activeStep}>{step}</button>)}</div>;
}