import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long does it take to launch a store?",
    answer: "Most team stores can be set up and launched within 5-7 business days from when we receive your logo files and product selections. For more complex stores with many products or custom designs, it may take up to 2 weeks. We'll provide a timeline during your consultation.",
  },
  {
    question: "How long should my store stay open?",
    answer: "We typically recommend keeping your store open for 2-3 weeks to give everyone time to order. For larger programs or organizations, you may want to extend to 4 weeks. We can also set up stores that remain open year-round with on-demand fulfillment.",
  },
  {
    question: "Can we do multiple stores per year?",
    answer: "Absolutely! Many programs run seasonal stores—a preseason store for gear, a holiday store for gifts, and a spring store for the next season. We make it easy to reopen or duplicate your store throughout the year.",
  },
  {
    question: "Can we add fundraising to our store?",
    answer: "Yes! You can add a fundraising amount ($3, $5, $10, or any amount you choose) to every item in your store. This gets added to the product price, and 100% of the fundraising amount goes back to your program. It's a hassle-free way to fundraise without selling candy bars or wrapping paper.",
  },
  {
    question: "What brands and products are available?",
    answer: "We offer a wide range of brands including Nike, Under Armour, Adidas, Russell Athletic, Augusta Sportswear, and more. Products include jerseys, t-shirts, hoodies, jackets, shorts, hats, bags, and promotional items—all customized with your team's logo and colors.",
  },
  {
    question: "How are orders fulfilled and shipped?",
    answer: "Once your store closes, we batch all orders together for production. Most orders are completed within 2-3 weeks of store closing. We can ship directly to each customer's home or bulk ship to a team location for distribution—whichever works best for your program.",
  },
];

export function TeamStoreFAQ() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Got questions? We've got answers.
        </p>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
