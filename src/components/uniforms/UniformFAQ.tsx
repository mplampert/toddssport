import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface UniformFAQProps {
  sportName?: string;
}

export function UniformFAQ({ sportName = "sport" }: UniformFAQProps) {
  const faqs = [
    {
      question: "What is the minimum order quantity?",
      answer:
        "Our minimum order is typically 12 units per style. This makes it easy for smaller teams, clubs, and rec leagues to get custom uniforms without overbuying.",
    },
    {
      question: "How long does production take?",
      answer:
        "Standard production is 3-4 weeks from order confirmation. Need them faster? We offer 10-day and 5-day rush options for an additional fee.",
    },
    {
      question: "Can I add player names and numbers?",
      answer:
        "Absolutely! You can add individual player names and numbers to each uniform. Just provide your roster during checkout and we'll handle the rest.",
    },
    {
      question: "What if I need help with my design?",
      answer:
        "Our design team is here to help—free of charge. Whether you need logo adjustments, color matching, or full design support, just ask and we'll work with you.",
    },
    {
      question: "What brands do you carry?",
      answer:
        "We partner with top athletic brands including Champro, Russell Athletic, Augusta Sportswear, and more. All customizable to your team's needs.",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Got questions about ordering {sportName.toLowerCase()} uniforms? We've got answers.
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
