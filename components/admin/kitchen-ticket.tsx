/**
 * The printable half of the order screen. Hidden on screen and revealed by the
 * print stylesheet, so `window.print()` produces a clean kitchen docket rather
 * than a screenshot of the dashboard.
 */
export function KitchenTicket({
  order,
  restaurantName,
}: {
  order: {
    orderNumber: string;
    orderType: string;
    createdAt: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    deliveryCity: string | null;
    deliveryPostalCode: string | null;
    specialNotes: string | null;
    items: { name: string; quantity: number; specialNotes: string | null }[];
  };
  restaurantName: string;
}) {
  return (
    <div className="hidden print:block print:p-0 print:font-mono print:text-black">
      <div className="border-b-2 border-black pb-2">
        <p className="text-lg font-bold">{restaurantName}</p>
        <p className="text-2xl font-bold">{order.orderNumber}</p>
        <p className="text-sm uppercase">{order.orderType.replace("_", " ")}</p>
        <p className="text-xs">{new Date(order.createdAt).toLocaleString()}</p>
      </div>

      <ul className="my-3 space-y-2">
        {order.items.map((item, index) => (
          <li key={index} className="border-b border-dashed border-black pb-1">
            <p className="text-base font-bold">
              {item.quantity} × {item.name}
            </p>
            {item.specialNotes && (
              <p className="pl-4 text-sm font-bold">** {item.specialNotes}</p>
            )}
          </li>
        ))}
      </ul>

      {order.specialNotes && (
        <p className="border-2 border-black p-2 text-sm font-bold">
          NOTE: {order.specialNotes}
        </p>
      )}

      <div className="mt-3 border-t-2 border-black pt-2 text-sm">
        <p className="font-bold">{order.customerName}</p>
        <p>{order.customerPhone}</p>
        {order.deliveryAddress && (
          <p>
            {order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}
          </p>
        )}
      </div>
    </div>
  );
}
