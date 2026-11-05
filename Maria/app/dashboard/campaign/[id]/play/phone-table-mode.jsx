"use client";

import { Fragment } from "react";

import { usePhoneLayout } from "@/lib/use-phone-layout";

export default function PhoneTableMode({ enabled, controller, children }) {
  const phone = usePhoneLayout();

  return enabled && phone ? (
    <Fragment key="at-table">{controller}</Fragment>
  ) : (
    <Fragment key="table">{children}</Fragment>
  );
}
