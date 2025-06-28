import classNames from "classnames";

export const Button = ({
  children,
  onClick,
  className,
  disabled,
  variant = "default"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
}) => {
  const base =
    "px-4 py-2 rounded text-white font-semibold transition focus:outline-none";
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700",
    destructive: "bg-red-600 hover:bg-red-700"
  };
  return (
    <button
      onClick={onClick}
      className={classNames(base, variants[variant], className)}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
