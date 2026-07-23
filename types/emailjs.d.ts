interface EmailJSResponse {
  status: number
  text: string
}

interface EmailJSDK {
  send(serviceId: string, templateId: string, data: Record<string, unknown>, publicKey: string): Promise<EmailJSResponse>
  sendForm(serviceId: string, templateId: string, form: HTMLFormElement | string, publicKey: string): Promise<EmailJSResponse>
}

declare global {
  interface Window {
    emailjs?: EmailJSDK
  }
}

export {}
