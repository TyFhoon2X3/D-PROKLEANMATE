'use client';

import Link from 'next/link';
import { useState } from 'react';

const slides = [
  {
    title: <>ทีมงานมืออาชีพ<br />ใส่ใจทุกรายละเอียด<br /><em>สะอาดครบวงจร</em></>,
    points: ['ทีมงานผ่านการอบรม และมีประสบการณ์ มากกว่า 20ปี', 'น้ำยาและอุปกรณ์ทันสมัย ปลอดภัย ได้มาตรฐาน', 'ให้บริการอย่างเป็นระบบ ใส่ใจทุกรายละเอียด'],
    theme: 'yellow',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85',
  },
  {
    title: <>ให้ทุกการทำความสะอาด<br />เป็นเรื่องง่าย<br />จองสะดวก<br />ติดตามงานได้<br /><em>มั่นใจทุกบริการ</em></>,
    description: 'ตรวจสอบรายละเอียดการจองและสถานะงานได้ง่ายๆ พร้อมให้บริการบ้านและพื้นที่ของคุณอย่างมืออาชีพ',
    theme: 'navy',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=700&q=85',
  },
  {
    title: <>จองทำความสะอาด<br />ง่ายไม่กี่ขั้นตอน</>,
    description: '• บ้าน • คอนโด • สำนักงาน • Big Cleaning',
    subDescription: 'เลือกบริการ วัน และเวลาที่ต้องการได้ง่ายๆ',
    theme: 'navy',
  },
];

export default function OnboardingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];
  const isLastSlide = activeSlide === slides.length - 1;

  const next = () => {
    if (isLastSlide) return;
    setActiveSlide((currentSlide) => currentSlide + 1);
  };

  return (
    <main className={`onboarding-page onboarding-${slide.theme}`}>
      {slide.image && <div className="onboarding-art" style={{ backgroundImage: `url(${slide.image})` }} aria-hidden="true" />}
      {!slide.image && <div className="onboarding-art onboarding-art-placeholder" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>}
      <section className="onboarding-copy">
        <div className="onboarding-logo"><span className="brand-shield"><span className="brand-roof" /></span><span>D-PROKLEANMATE</span></div>
        <h1>{slide.title}</h1>
        {slide.points && <ul>{slide.points.map((point) => <li key={point}>{point}</li>)}</ul>}
        {slide.description && <p>{slide.description}</p>}
        {slide.subDescription && <p className="onboarding-subdescription">{slide.subDescription}</p>}
        <div className="onboarding-controls">
          <div className="onboarding-dots">{slides.map((_, index) => <button type="button" key={index} className={activeSlide === index ? 'active' : ''} onClick={() => setActiveSlide(index)} aria-label={`สไลด์ที่ ${index + 1}`} />)}</div>
          {isLastSlide ? <Link href="/login" className="onboarding-button">เข้าสู่ระบบ / สมัครสมาชิก</Link> : <button type="button" className="onboarding-button" onClick={next}>ถัดไป</button>}
        </div>
      </section>
    </main>
  );
}