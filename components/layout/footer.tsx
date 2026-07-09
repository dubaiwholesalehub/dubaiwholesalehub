import Container from "./container";

export default function Footer() {
  return (
    <footer className="border-t bg-slate-950 py-12 text-white">
      <Container>
        <h3 className="text-2xl font-semibold">
          SANWAN ALSHAMS TRADING LLC
        </h3>

        <p className="mt-4 max-w-2xl text-slate-300">
          Dubai's trusted wholesale, export and product sourcing partner.
        </p>

        <div className="mt-8 border-t border-slate-800 pt-8 text-sm text-slate-400">
          © {new Date().getFullYear()} DubaiWholesaleHub. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}