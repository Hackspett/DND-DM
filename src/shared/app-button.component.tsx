import { Button, type ButtonProps } from "@mantine/core";
import type { ComponentPropsWithoutRef } from "react";

type AppButtonProps = ButtonProps & ComponentPropsWithoutRef<"button">;

function AppButton({
  className = "",
  color,
  size = "sm",
  type = "submit",
  variant,
  ...props
}: AppButtonProps) {
  const classes = className.split(/\s+/);
  const isPrimary = classes.includes("primary-button");
  const isSecondary = classes.includes("secondary-button");
  const isDanger = classes.includes("danger-text-button");
  const isSubtle = classes.includes("subtle-button");

  return (
    <Button
      {...props}
      component="button"
      className={className}
      color={color ?? (isDanger ? "red" : "dndGreen")}
      size={size}
      type={type}
      variant={variant ?? (
        isPrimary ? "filled" :
          isSecondary ? "default" :
            isDanger || isSubtle ? "subtle" :
              "transparent"
      )}
    />
  );
}

export default AppButton;
