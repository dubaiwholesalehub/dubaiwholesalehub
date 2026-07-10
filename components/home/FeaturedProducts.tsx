import Container from "../layout/container";
import { ArrowRight, MessageCircle } from "lucide-react";

const products = [
  {
    name: "Premium Kitchen Storage Set",
    category: "Kitchen Appliances",
    moq: "MOQ: 100 Pieces",
    image: "/products/product-1.jpg",
  },
  {
    name: "Professional Hardware Tools",
    category: "Tools & Hardware",
    moq: "MOQ: 50 Pieces",
    image: "/products/product-2.jpg",
  },
  {
    name: "Smart Electronic Gadgets",
    category: "Electronics",
    moq: "MOQ: 100 Pieces",
    image: "/products/product-3.jpg",
  },
  {
    name: "Beauty & Personal Care Items",
    category: "Beauty & Cosmetics",
    moq: "MOQ: 200 Pieces",
    image: "/products/product-4.jpg",
  },
];

export default function FeaturedProducts() {
  return (
    <section className="bg-white py-24">
      <Container>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
              Product Catalog
            </p>

            <h2 className="mt-3 text-4xl font-bold text-slate-900">
              Featured Wholesale Products
            </h2>

            <p className="mt-4 max-w-2xl text-slate-600">
              Explore selected products available for wholesale,
              export and international sourcing.
            </p>
          </div>


          <button className="flex items-center gap-2 font-semibold text-amber-600 hover:text-amber-700">
            View All Products
            <ArrowRight size={18}/>
          </button>

        </div>


        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {products.map((product)=>(
            
            <div
              key={product.name}
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >

              <div className="flex h-52 items-center justify-center bg-slate-100">
                
                <span className="text-slate-400">
                  Product Image
                </span>

              </div>


              <div className="p-6">

                <span className="text-sm text-amber-600">
                  {product.category}
                </span>


                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {product.name}
                </h3>


                <p className="mt-3 text-sm text-slate-500">
                  {product.moq}
                </p>


                <button
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  <MessageCircle size={18}/>
                  Request Quote
                </button>

              </div>

            </div>

          ))}

        </div>


      </Container>
    </section>
  );
}