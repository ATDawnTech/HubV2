import React from "react";
import clsx from "clsx";

interface Heading2Props {
  children: React.ReactNode;
  className?: string;
}

export const Heading2: React.FC<Heading2Props> = ({ children, className }) => (
  <h3 className={clsx("text-3xl font-extrabold uppercase tracking-wide text-muted-foreground", className)}>
    {children}
  </h3>
);
