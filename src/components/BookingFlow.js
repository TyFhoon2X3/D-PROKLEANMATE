'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const defaultServices = [
  { name: 'ทำความสะอาดบ้าน', price: 'เริ่มต้น 45 บาท/ตร.ม.', featured: true },
  { name: 'ทำความสะอาดบ้านคอนโด', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
  { name: 'ทำความสะอาดสำนักงาน', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
  { name: 'Big Cleaning', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
  { name: 'ขอโปไซน์', price: 'เริ่มต้น 1,500 บาท' },
  { name: 'หลังน้ำท่วม', price: 'เริ่มต้น 45 บาท/ตร.ม.' },
];

const addressFields = [
  { name: 'houseNumber', label: 'เลขที่บ้าน', placeholder: 'เช่น 99/1', required: true },
  { name: 'moo', label: 'หมู่ที่', placeholder: 'ถ้ามี' },
  { name: 'building', label: 'อาคาร/หมู่บ้าน', placeholder: 'ถ้ามี' },
  { name: 'soi', label: 'ซอย', placeholder: 'ถ้ามี' },
  { name: 'road', label: 'ถนน', placeholder: 'ถ้ามี' },
  { name: 'subdistrict', label: 'ตำบล/แขวง', placeholder: 'กรอกตำบลหรือแขวง', required: true },
  { name: 'district', label: 'อำเภอ/เขต', placeholder: 'กรอกอำเภอหรือเขต', required: true },
  { name: 'province', label: 'จังหวัด', placeholder: 'กรอกจังหวัด', required: true },
  { name: 'postalCode', label: 'รหัสไปรษณีย์', placeholder: '5 หลัก', required: true },
];

const formatServiceAddress = (address) => [
  `บ้านเลขที่ ${address.houseNumber}`,
  address.moo && `หมู่ ${address.moo}`,
  address.building && `อาคาร/หมู่บ้าน ${address.building}`,
  address.soi && `ซอย ${address.soi}`,
  address.road && `ถนน ${address.road}`,
  `ตำบล/แขวง ${address.subdistrict}`,
  `อำเภอ/เขต ${address.district}`,
  `จังหวัด ${address.province}`,
  `รหัสไปรษณีย์ ${address.postalCode}`,
].filter(Boolean).join(' ');

const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const getToday = () => {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
};

export default function BookingFlow() {
  const router = useRouter();
  const today = getToday();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState(defaultServices);
  const [selectedService, setSelectedService] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today.day);
  const [bookedVisitDates, setBookedVisitDates] = useState([]);
  const [isLoadingVisitDates, setIsLoadingVisitDates] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  });
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('DP0000');
  const [bookingId, setBookingId] = useState(null);
  const [account, setAccount] = useState({ name: '', phone: '', email: '' });
  const [customer, setCustomer] = useState({ houseNumber: '', moo: '', building: '', soi: '', road: '', subdistrict: '', district: '', province: '', postalCode: '' });
  const [paymentMethod, setPaymentMethod] = useState('qr');

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/auth/me');
      const { user } = await response.json();
      if (!user) {
        router.replace('/login');
        return;
      }
      setAccount({ name: user.full_name || user.username || '', phone: user.phone || '', email: user.email || '' });
      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    const loadServices = async () => {
      const response = await fetch('/api/services');
      const { services: data } = await response.json();
      if (data?.length) setServices(data.map((service) => ({ id: service.id, name: service.name, price: service.starting_price || service.price, image_url: service.image_url })));
    };
    loadServices();
  }, []);

  useEffect(() => {
    if (step !== 2) return undefined;

    const controller = new AbortController();
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    const exclude = bookingId ? `&exclude=${bookingId}` : '';

    const loadAvailability = async () => {
      setIsLoadingVisitDates(true);
      setAvailabilityError('');
      try {
        const response = await fetch(`/api/bookings/availability?month=${year}-${month}${exclude}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'ตรวจสอบวันว่างไม่สำเร็จ');
        setBookedVisitDates(result.dates || []);
      } catch (error) {
        if (error.name !== 'AbortError') setAvailabilityError(error.message || 'ตรวจสอบวันว่างไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setIsLoadingVisitDates(false);
      }
    };

    loadAvailability();
    return () => controller.abort();
  }, [step, calendarMonth, bookingId]);

  const nextStep = () => {
    if (step === 1) {
      setAvailabilityError('');
      setIsLoadingVisitDates(true);
    }
    setStep((currentStep) => Math.min(currentStep + 1, 4));
  };
  const previousStep = () => setStep((currentStep) => Math.max(currentStep - 1, 1));
  const goToStep = (nextStep) => {
    if (nextStep <= step) {
      if (nextStep === 2) {
        setAvailabilityError('');
        setIsLoadingVisitDates(true);
      }
      setStep(nextStep);
    }
  };

  const changeMonth = (offset) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    const isBeforeCurrentMonth = nextMonth.getFullYear() < today.year
      || (nextMonth.getFullYear() === today.year && nextMonth.getMonth() < today.month);
    if (isBeforeCurrentMonth) return;
    setAvailabilityError('');
    setIsLoadingVisitDates(true);
    setSelectedDate(nextMonth.getFullYear() === today.year && nextMonth.getMonth() === today.month ? today.day : 1);
    setCalendarMonth(nextMonth);
  };

  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = `${thaiMonths[calendarMonth.getMonth()]} ${calendarMonth.getFullYear() + 543}`;
  const selectedIsoDate = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
  const isDatePast = (day) => calendarMonth.getFullYear() < today.year
    || (calendarMonth.getFullYear() === today.year && calendarMonth.getMonth() < today.month)
    || (calendarMonth.getFullYear() === today.year && calendarMonth.getMonth() === today.month && day < today.day);
  const isVisitDateBooked = (day) => bookedVisitDates.includes(
    `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );
  const updateCustomer = (field, value) => {
    setCustomer((currentCustomer) => ({ ...currentCustomer, [field]: value }));
  };

  const saveBooking = async (event) => {
    event.preventDefault();
    setBookingMessage('');
    if (!customer.houseNumber || !customer.subdistrict || !customer.district || !customer.province || !/^\d{5}$/.test(customer.postalCode) || !paymentMethod) {
      setBookingMessage('กรุณากรอกที่อยู่ที่มีเครื่องหมาย * ให้ครบถ้วน และตรวจสอบรหัสไปรษณีย์ 5 หลัก');
      return;
    }

    if (isDatePast(selectedDate)) {
      setBookingMessage('วันที่เลือกผ่านไปแล้ว กรุณาเลือกวันใหม่');
      return;
    }
    if (isVisitDateBooked(selectedDate)) {
      setBookingMessage('วันที่เข้าประเมินสถานที่นี้มีผู้จองแล้ว กรุณาเลือกวันอื่น');
      return;
    }

    setIsSaving(true);
    if (!services[selectedService]) {
      setBookingMessage('กรุณาเลือกบริการ');
      setIsSaving(false);
      return;
    }
    const sessionResponse = await fetch('/api/auth/me');
    const { user } = await sessionResponse.json();
    if (!user) {
      router.replace('/login');
      return;
    }

    const selectedServiceData = services[selectedService];
    const response = await fetch(bookingId ? `/api/bookings/${bookingId}` : '/api/bookings', {
      method: bookingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_name: selectedServiceData.name,
        site_visit_date: selectedIsoDate,
        service_address: customer,
        payment_method: paymentMethod,
      }),
    });
    const result = await response.json();

    setIsSaving(false);
    if (!response.ok) {
      setBookingMessage(result.error || 'บันทึกการจองไม่สำเร็จ');
      return;
    }

    setOrderNumber(result.order_number);
  if (result.id) setBookingId(result.id);
    setStep(4);
  };

  if (isCheckingSession) {
    return <main className="auth-status"><p>กำลังตรวจสอบบัญชี...</p></main>;
  }

  return (
    <main className="booking-page">
      <header className="booking-header">
        <Link className="home-brand" href="/" aria-label="D-ProKleanMate หน้าแรก">
          <span className="brand-shield" aria-hidden="true" />
          <span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span>
        </Link>
        <nav className="home-nav" aria-label="เมนูหลัก">
          <Link href="/#services">บริการของเรา</Link>
          <Link href="/#how-it-works">ขั้นตอนการจอง</Link>
          <Link href="/login">เข้าสู่ระบบ</Link>
          <Link className="home-nav-book" href="/booking">จองบริการ</Link>
        </nav>
      </header>

      <section className="booking-content">
        {step > 1 && <button type="button" className="back-step" onClick={previousStep}>← ย้อนกลับ</button>}
        {step === 1 && <>
          <h1>เลือกบริการ</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <div className="service-list">
            {services.map((service, index) => (
              <button type="button" className={`service-option ${selectedService === index ? 'selected' : ''}`} key={service.id || service.name} onClick={() => setSelectedService(index)}>
                {service.image_url ? <Image className="service-image service-image-uploaded" src={service.image_url} width={79} height={43} unoptimized alt="" /> : <span className={`service-image service-image-${index}`} aria-hidden="true" />}
                <span className="service-copy"><strong>{service.name}</strong><small>{service.price}</small></span>
                <span className="service-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button type="button" className="next-button" disabled={!services.length} onClick={nextStep}>ถัดไป</button>
        </>}

        {step === 2 && <>
          <h1>เลือกวันที่เข้าประเมินสถานที่</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <h2 className="booking-label">เลือกวันที่เข้าประเมินสถานที่</h2>
          <div className="calendar">
            <div className="calendar-heading"><button type="button" onClick={() => changeMonth(-1)} aria-label="เดือนก่อนหน้า">‹</button><strong>{monthLabel}</strong><button type="button" onClick={() => changeMonth(1)} aria-label="เดือนถัดไป">›</button></div>
            <div className="calendar-week"><span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span></div>
            <div className="calendar-days">
              {[...Array(firstDayOfMonth)].map((_, index) => <span key={`empty-${index}`} />)}
              {[...Array(daysInMonth)].map((_, index) => {
                const day = index + 1;
                const isBooked = isVisitDateBooked(day);
                const className = [selectedDate === day && 'selected', isBooked && 'booked'].filter(Boolean).join(' ');
                return <button type="button" key={day} className={className} aria-label={isBooked ? `${day} ${thaiMonths[calendarMonth.getMonth()]} ถูกจองแล้ว` : `${day} ${thaiMonths[calendarMonth.getMonth()]}`} title={isBooked ? 'มีผู้จองแล้ว' : undefined} disabled={isDatePast(day) || isBooked || isLoadingVisitDates || Boolean(availabilityError)} onClick={() => setSelectedDate(day)}>{day}</button>;
              })}
            </div>
          </div>
          {isLoadingVisitDates && <p className="booking-slot-note">กำลังตรวจสอบวันว่าง...</p>}
          {!isLoadingVisitDates && !availabilityError && <p className="booking-slot-note">วันที่ขีดฆ่ามีผู้จองแล้ว กรุณาเลือกวันอื่น</p>}
          {availabilityError && <p className="booking-error" role="alert">{availabilityError}</p>}
          <button type="button" className="next-button" disabled={isDatePast(selectedDate) || isVisitDateBooked(selectedDate) || isLoadingVisitDates || Boolean(availabilityError)} onClick={nextStep}>ถัดไป</button>
        </>}

        {step === 3 && <>
          <h1>การจองบริการ</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <h2 className="booking-label">ข้อมูลผู้จอง</h2>
          <form className="customer-form" onSubmit={saveBooking}>
            <div className="booking-account-info"><strong>ข้อมูลจากบัญชีผู้ใช้</strong><span>{account.name || 'ยังไม่มีชื่อในโปรไฟล์'}</span><span>{account.phone || 'ยังไม่มีเบอร์โทรศัพท์ในโปรไฟล์'}</span><span>{account.email}</span></div>
            <h3 className="address-form-heading">ที่อยู่สำหรับให้บริการ</h3>
            <div className="address-fields">
              {addressFields.map((field) => <label key={field.name} htmlFor={`service-address-${field.name}`}><span>{field.label}{field.required && <> <b>*</b></>}</span><input id={`service-address-${field.name}`} name={field.name} placeholder={field.placeholder} required={field.required} inputMode={field.name === 'postalCode' ? 'numeric' : undefined} maxLength={field.name === 'postalCode' ? 5 : undefined} value={customer[field.name]} onChange={(event) => updateCustomer(field.name, event.target.value)} /></label>)}
            </div>
            <label htmlFor="payment-method">วิธีชำระเงิน <b>*</b></label>
            <select id="payment-method" className="payment-method-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="qr">ชำระผ่าน QR Code</option>
              <option value="cash">ชำระเงินสด</option>
            </select>
            {bookingMessage && <p className="booking-error" role="alert">{bookingMessage}</p>}
            <button type="submit" className="next-button" disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : 'ถัดไป'}</button>
          </form>
        </>}

        {step === 4 && <>
          <h1>รายละเอียดการจอง</h1>
          <StepIndicator activeStep={step} onStepClick={goToStep} />
          <div className="booking-summary-header"><div>หมายเลขออเดอร์<br /><strong>{orderNumber}</strong></div><span>รอการยืนยัน</span></div>
          <div className="booking-summary-card">
            {services[selectedService].image_url ? <Image className="summary-service-image summary-service-image-uploaded" src={services[selectedService].image_url} width={94} height={70} unoptimized alt="" /> : <div className={`summary-service-image service-image-${selectedService}`} />}
            <div><strong>{services[selectedService].name}</strong><small>{services[selectedService].price}</small></div>
          </div>
          <div className="booking-details-grid">
            <div><small>วันที่เข้าประเมินสถานที่</small><strong>{selectedDate} {thaiMonths[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}</strong></div>
            <div><small>วันที่เข้าทำความสะอาด</small><strong>รอแอดมินกำหนด</strong></div>
            <div><small>วิธีชำระเงิน</small><strong>{paymentMethod === 'qr' ? 'QR Code' : 'เงินสด'}</strong></div>
            <div><small>ชื่อผู้จอง</small><strong>{account.name || '-'}</strong></div>
            <div><small>เบอร์โทรศัพท์</small><strong>{account.phone || '-'}</strong></div>
            <div className="full-detail"><small>อีเมล</small><strong>{account.email || '-'}</strong></div>
            <div className="full-detail"><small>ที่อยู่ให้บริการ</small><strong>{formatServiceAddress(customer)}</strong></div>
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