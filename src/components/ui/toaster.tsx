"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, icon, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex gap-3">
              {icon ? (
                <div className="shrink-0">{icon}</div>
              ) : (
                <>
                  {props.variant === "success" && (
                    <CheckCircle className="h-5 w-5 text-emerald-700 shrink-0" />
                  )}
                  {props.variant === "destructive" && (
                    <AlertCircle className="h-5 w-5 text-red-700 shrink-0" />
                  )}
                  {(!props.variant || props.variant === "default") && (
                    <Info className="h-5 w-5 text-blue-700 shrink-0" />
                  )}
                </>
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}