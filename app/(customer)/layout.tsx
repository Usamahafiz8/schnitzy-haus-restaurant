import { SiteHeader } from "@/components/customer/site-header";
import { SiteFooter } from "@/components/customer/site-footer";
import { BottomNav } from "@/components/customer/bottom-nav";
import { PushRegistrar } from "@/components/customer/push-registrar";
import { getRestaurant } from "@/lib/restaurant";
import { isOpenAt, type OpeningHours } from "@/lib/utils";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const restaurant = await getRestaurant();

  // The app is usable before seeding; the header just shows "closed".
  const isOpenNow = restaurant
    ? isOpenAt(restaurant.openingHours as OpeningHours)
    : false;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isOpenNow={isOpenNow} />

      <main id="main" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {restaurant && (
        <SiteFooter
          restaurant={{
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            postalCode: restaurant.postalCode,
            phone: restaurant.phone,
            email: restaurant.email,
            whatsappNumber: restaurant.whatsappNumber,
          }}
        />
      )}

      <BottomNav />
      <PushRegistrar />
    </div>
  );
}
