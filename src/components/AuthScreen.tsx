import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { login, register } from "@/lib/auth";
import type { User } from "@/lib/auth";

interface AuthScreenProps {
  onAuth: (user: User) => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await login(email, password);
      } else {
        result = await register(email, password, name);
      }
      onAuth(result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Icon name="ListChecks" size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Менеджер задач</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Войдите в аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Имя</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как вас зовут?"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Минимум 6 символов" : "Введите пароль"}
              required
              minLength={mode === "register" ? 6 : undefined}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <Icon name="Loader2" size={16} className="animate-spin" />
            ) : (
              <Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={16} />
            )}
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? (
              <>Нет аккаунта? <span className="font-medium text-primary">Зарегистрируйтесь</span></>
            ) : (
              <>Уже есть аккаунт? <span className="font-medium text-primary">Войдите</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
