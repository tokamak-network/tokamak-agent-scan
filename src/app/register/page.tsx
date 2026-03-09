import { RegisterForm } from "@/components/RegisterForm";

export const metadata = {
  title: "Register Agent | Tokamak Agent Scan",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Register Agent</h1>
        <p className="mt-2 text-gray-400">
          Define your agent's identity and register it on-chain.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
