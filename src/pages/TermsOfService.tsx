import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: February 2, 2026
          </p>

          <div className="prose prose-lg max-w-none text-foreground">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground mb-4">
                These Terms of Service ("Terms") govern your access to and use of the Todd's Sporting Goods website and services. By accessing or using our website, you agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-muted-foreground">
                If you do not agree to these Terms, you may not access or use our website or services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Our Services</h2>
              <p className="text-muted-foreground mb-4">
                Todd's Sporting Goods provides:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Custom team uniforms and athletic apparel</li>
                <li>Spirit wear and fanwear for schools and organizations</li>
                <li>Corporate apparel and branded merchandise</li>
                <li>Promotional products and custom gear</li>
                <li>Online team stores and e-commerce solutions</li>
                <li>Screen printing, embroidery, and customization services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Account Registration</h2>
              <p className="text-muted-foreground mb-4">
                Some features of our website may require you to create an account. When creating an account, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information as needed</li>
                <li>Keep your account credentials secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Orders and Payments</h2>
              
              <h3 className="text-xl font-medium mb-3">Pricing</h3>
              <p className="text-muted-foreground mb-4">
                All prices are quoted in U.S. dollars and are subject to change without notice. Quoted prices are valid for the timeframe specified in the quote. We reserve the right to correct pricing errors.
              </p>

              <h3 className="text-xl font-medium mb-3">Order Acceptance</h3>
              <p className="text-muted-foreground mb-4">
                All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including but not limited to product availability, errors in pricing or product information, or suspected fraud.
              </p>

              <h3 className="text-xl font-medium mb-3">Payment Terms</h3>
              <p className="text-muted-foreground mb-4">
                Payment terms vary based on order type and customer relationship:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Custom orders typically require a 50% deposit with the balance due before shipping</li>
                <li>Team store orders are paid by individual purchasers at checkout</li>
                <li>Established accounts may have net terms available upon approval</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">Cancellations</h3>
              <p className="text-muted-foreground">
                Custom orders cannot be cancelled once production has begun. Stock orders may be cancelled within 24 hours of placement. Cancellation fees may apply depending on the order status.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Custom Products and Artwork</h2>
              
              <h3 className="text-xl font-medium mb-3">Artwork Requirements</h3>
              <p className="text-muted-foreground mb-4">
                You are responsible for providing artwork that is suitable for reproduction. We may require vector files or high-resolution images. Additional fees may apply for artwork recreation or cleanup.
              </p>

              <h3 className="text-xl font-medium mb-3">Proof Approval</h3>
              <p className="text-muted-foreground mb-4">
                You are responsible for reviewing and approving proofs before production. Once approved, you accept responsibility for the accuracy of all text, colors, sizing, and design elements. We are not responsible for errors in approved proofs.
              </p>

              <h3 className="text-xl font-medium mb-3">Intellectual Property</h3>
              <p className="text-muted-foreground">
                You represent and warrant that you have the right to use any logos, trademarks, or artwork submitted for production. You agree to indemnify us against any claims arising from the use of artwork you provide. We will not reproduce copyrighted or trademarked materials without proper authorization.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Shipping and Delivery</h2>
              <p className="text-muted-foreground mb-4">
                Delivery timeframes are estimates and not guaranteed unless specifically agreed upon in writing. We are not responsible for delays caused by:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Carrier delays or shipping issues</li>
                <li>Incorrect shipping information provided by customer</li>
                <li>Weather or other force majeure events</li>
                <li>Delays in artwork approval or customer response</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Risk of loss passes to you upon delivery to the carrier.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Returns and Exchanges</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Custom Products:</strong> Custom and personalized items cannot be returned or exchanged unless there is a manufacturing defect or error on our part.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Stock Products:</strong> Unworn, unwashed stock items with original tags may be exchanged within 30 days. Return shipping is the customer's responsibility unless the return is due to our error.
              </p>
              <p className="text-muted-foreground">
                <strong>Defective Products:</strong> Products with manufacturing defects will be replaced at no charge. Please contact us within 14 days of receipt to report defects.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                To the maximum extent permitted by law, Todd's Sporting Goods shall not be liable for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, revenue, or business opportunities</li>
                <li>Damages exceeding the amount paid for the specific product or service</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                This limitation applies regardless of the legal theory on which the claim is based.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify, defend, and hold harmless Todd's Sporting Goods, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses arising from your use of our services, violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the state or federal courts located in Sangamon County, Illinois.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Changes will be effective upon posting to our website. Your continued use of our services after changes are posted constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <p className="text-muted-foreground mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-muted/50 p-6 rounded-lg">
                <p className="font-semibold text-foreground">Todd's Sporting Goods</p>
                <p className="text-muted-foreground">Email: sales@toddssportinggoods.com</p>
                <p className="text-muted-foreground">Phone: (978) 927-1600</p>
                <p className="text-muted-foreground">Address: 393 Cabot St., Beverly, MA 01915</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
