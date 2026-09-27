import { Banner, Heading, SectionHeading } from '@/components/ui';
import { Coupons } from '@/features/coupons';
export const metadata = { title: '쿠폰' };
export default function Page() {
  return (
    <div className="container page">
      <Heading title="쿠폰" eyebrow="A little extra joy" />
      <Banner kind="coupon" showLink={false} />
      <section className="section">
        <SectionHeading
          title="지금 받을 수 있는 쿠폰"
          description="발급 조건과 사용 기한을 확인해 주세요."
        />
        <Coupons />
      </section>
    </div>
  );
}
