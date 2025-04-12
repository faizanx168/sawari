import { useToast as useToastUI } from "@/app/hooks/use-toast"

export const useToast = () => {
  const { toast } = useToastUI()

  return {
    toast: (props: {
      title?: string
      description?: string
      variant?: "default" | "destructive"
    }) => {
      toast({
        ...props,
      })
    },
  }
} 