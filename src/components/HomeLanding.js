'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const fallbackServices = [
  { name: 'ทำความสะอาดบ้าน' },
  { name: 'ทำความสะอาดคอนโด' },
  { name: 'ทำความสะอาดสำนักงาน' },
  { name: 'Big Cleaning' },
];

const bookingSteps = [
  { number: '01', title: 'เลือกบริการ', description: 'เลือกประเภทพื้นที่ที่ต้องการให้เราดูแล' },
  { number: '02', title: 'เลือกวันนัดประเมิน', description: 'เลือกวันที่สะดวก แล้วแจ้งรายละเอียดสถานที่' },
  { number: '03', title: 'ติดตามการจอง', description: 'ดูสถานะและรายละเอียดงานได้จากบัญชีของคุณ' },
];

function formatPrice(price) {
  if (price === null || price === undefined || price === '') return 'สอบถามราคา';
  if (typeof price === 'number' || /^\d+(\.\d+)?$/.test(String(price))) {
    return `เริ่มต้น ${Number(price).toLocaleString('th-TH')} บาท`;
  }
  const value = String(price);
  return value.startsWith('เริ่มต้น') ? value : `เริ่มต้น ${value}`;
}

export default function HomeLanding() {
  const [services, setServices] = useState(fallbackServices);

  useEffect(() => {
    let isActive = true;

    fetch('/api/services')
      .then((response) => {
        if (!response.ok) throw new Error('Services could not be loaded');
        return response.json();
      })
      .then(({ services: data }) => {
        if (isActive && data?.length) setServices(data);
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="home-page">
      <header className="home-header">
        <Link className="home-brand" href="/" aria-label="D-ProKleanMate หน้าแรก">
          <span className="brand-shield" aria-hidden="true" />
          <span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span>
        </Link>
        <nav className="home-nav" aria-label="เมนูหลัก">
          <a href="#services">บริการของเรา</a>
          <a href="#how-it-works">ขั้นตอนการจอง</a>
          <Link href="/login">เข้าสู่ระบบ</Link>
          <Link className="home-nav-book" href="/booking">จองบริการ</Link>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-photo" aria-hidden="true" />
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-content">
          <p className="home-eyebrow">บริการทำความสะอาดสำหรับทุกพื้นที่</p>
          <h1>บ้านสะอาดขึ้น<br />เวลาของคุณก็กลับมา</h1>
          <p className="home-hero-description">ทีมงานมืออาชีพ ใส่ใจทุกขั้นตอน ตั้งแต่เลือกบริการจนติดตามงาน</p>
          <div className="home-hero-actions">
            <Link className="home-primary-button" href="/booking">เริ่มจองบริการ <span aria-hidden="true">→</span></Link>
            <a className="home-secondary-link" href="#services">ดูบริการทั้งหมด</a>
          </div>
        </div>
        <div className="home-hero-caption"><span className="home-caption-mark" /> ดูแลบ้านและพื้นที่ของคุณอย่างใส่ใจ</div>
      </section>

      <section className="home-services" id="services">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow home-eyebrow-dark">บริการของเรา</p>
            <h2>เลือกบริการที่ใช่สำหรับคุณ</h2>
          </div>
          <p>มีทั้งงานดูแลประจำและทำความสะอาดครั้งใหญ่<br className="desktop-break" /> เลือกบริการเพื่อดูราคาและวันนัดที่สะดวก</p>
        </div>
        <div className="home-service-grid">
          {services.map((service, index) => (
            <Link className="home-service-item" href="/booking" key={service.id || service.name}>
              <span className={`home-service-image home-service-image-${index % 4}`}>
                {service.image_url && <Image src={service.image_url} alt="" width={560} height={300} unoptimized />}
                {!service.image_url && <span className="home-service-number">0{index + 1}</span>}
              </span>
              <span className="home-service-info">
                <span><strong>{service.name}</strong><small>{formatPrice(service.starting_price || service.price)}</small></span>
                <span className="home-service-arrow" aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="home-services-cta">
          <span>ไม่แน่ใจว่าควรเลือกบริการไหน?</span>
          <Link href="/booking">เริ่มเลือกบริการ <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="home-process" id="how-it-works">
        <div className="home-process-heading">
          <p className="home-eyebrow">จองง่ายใน 3 ขั้นตอน</p>
          <h2>เริ่มต้นพื้นที่สะอาด<br />ได้ไม่กี่ขั้นตอน</h2>
        </div>
        <div className="home-process-steps">
          {bookingSteps.map((step) => (
            <article className="home-process-step" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <Link className="home-brand" href="/" aria-label="D-ProKleanMate หน้าแรก">
          <span className="brand-shield" aria-hidden="true" />
          <span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span>
        </Link>
        <p>พื้นที่สะอาด เริ่มต้นได้ที่นี่</p>
        <Link className="home-footer-book" href="/booking">จองบริการ <span aria-hidden="true">→</span></Link>
      </footer>
    </main>
  );
}