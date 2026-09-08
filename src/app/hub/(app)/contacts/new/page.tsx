import { ContactForm } from "@/components/hub/ContactForm";

export default function NewContactPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-white">New contact</h1>
      <ContactForm />
    </div>
  );
}
