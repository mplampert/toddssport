const previewCategories = [
  {
    title: "Player Packages",
    items: [
      { name: "Game Jersey", price: "$65.00" },
      { name: "Practice Jersey", price: "$35.00" },
      { name: "Team Shorts", price: "$28.00" },
    ],
  },
  {
    title: "Fanwear & Spirit Wear",
    items: [
      { name: "Team Hoodie", price: "$48.00" },
      { name: "Spirit T-Shirt", price: "$22.00" },
      { name: "Rally Towel", price: "$12.00" },
    ],
  },
  {
    title: "Coaches & Staff Gear",
    items: [
      { name: "Coaches Polo", price: "$42.00" },
      { name: "Staff Jacket", price: "$68.00" },
      { name: "Team Cap", price: "$24.00" },
    ],
  },
  {
    title: "Accessories & Promo Items",
    items: [
      { name: "Team Bag", price: "$38.00" },
      { name: "Water Bottle", price: "$15.00" },
      { name: "Sticker Pack", price: "$8.00" },
    ],
  },
];

export function StorePreview() {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          What Your Store Could Look Like
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          A preview of the types of products and categories available in a Todd's Team Store.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewCategories.map((category, categoryIndex) => (
            <div 
              key={categoryIndex}
              className="bg-card rounded-xl border border-border p-6 shadow-sm"
            >
              <h3 className="font-bold text-lg text-foreground mb-4 pb-2 border-b border-border">
                {category.title}
              </h3>
              <ul className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold text-accent">{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          * Sample products shown. Your store will be fully customized to your program's needs.
        </p>
      </div>
    </section>
  );
}
