export type WebhookEvent = {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    phone_numbers: Array<{ phone_number: string }>;
    username: string | null;
    public_metadata?: Record<string, any>;
    private_metadata?: Record<string, any>;
  };
  type: "user.created" | "user.updated" | "user.deleted";
};