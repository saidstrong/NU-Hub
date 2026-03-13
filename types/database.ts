export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DatabaseSchema = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          nu_email: string;
          full_name: string;
          school: string | null;
          major: string | null;
          year_label: string | null;
          bio: string | null;
          interests: string[];
          goals: string[];
          looking_for: string[];
          skills: string[];
          projects: Json;
          resume_url: string | null;
          links: Json;
          avatar_path: string | null;
          onboarding_step:
            | "profile"
            | "interests"
            | "looking_for"
            | "professional"
            | "completed";
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          nu_email: string;
          full_name?: string;
          school?: string | null;
          major?: string | null;
          year_label?: string | null;
          bio?: string | null;
          interests?: string[];
          goals?: string[];
          looking_for?: string[];
          skills?: string[];
          projects?: Json;
          resume_url?: string | null;
          links?: Json;
          avatar_path?: string | null;
          onboarding_step?:
            | "profile"
            | "interests"
            | "looking_for"
            | "professional"
            | "completed";
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          nu_email?: string;
          full_name?: string;
          school?: string | null;
          major?: string | null;
          year_label?: string | null;
          bio?: string | null;
          interests?: string[];
          goals?: string[];
          looking_for?: string[];
          skills?: string[];
          projects?: Json;
          resume_url?: string | null;
          links?: Json;
          avatar_path?: string | null;
          onboarding_step?:
            | "profile"
            | "interests"
            | "looking_for"
            | "professional"
            | "completed";
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          price_kzt: number;
          category: string;
          condition: string;
          pickup_location: string;
          status: "draft" | "active" | "reserved" | "sold" | "archived";
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string | null;
          price_kzt: number;
          category: string;
          condition: string;
          pickup_location: string;
          status?: "draft" | "active" | "reserved" | "sold" | "archived";
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          title?: string;
          description?: string | null;
          price_kzt?: number;
          category?: string;
          condition?: string;
          pickup_location?: string;
          status?: "draft" | "active" | "reserved" | "sold" | "archived";
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          storage_path?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      saved_listings: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          listing_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          listing_id?: string;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          created_by: string | null;
          title: string;
          description: string | null;
          category: string;
          starts_at: string;
          ends_at: string | null;
          location: string;
          cover_path: string | null;
          is_published: boolean;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          title: string;
          description?: string | null;
          category: string;
          starts_at: string;
          ends_at?: string | null;
          location: string;
          cover_path?: string | null;
          is_published?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          title?: string;
          description?: string | null;
          category?: string;
          starts_at?: string;
          ends_at?: string | null;
          location?: string;
          cover_path?: string | null;
          is_published?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      event_participants: {
        Row: {
          event_id: string;
          user_id: string;
          status: "interested" | "going";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status: "interested" | "going";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          status?: "interested" | "going";
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_events: {
        Row: {
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string;
          created_at?: string;
        };
      };
      communities: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          description: string;
          tags: string[];
          category: string | null;
          avatar_path: string | null;
          join_type: "open" | "request";
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          description: string;
          tags?: string[];
          category?: string | null;
          avatar_path?: string | null;
          join_type?: "open" | "request";
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          name?: string;
          description?: string;
          tags?: string[];
          category?: string | null;
          avatar_path?: string | null;
          join_type?: "open" | "request";
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      community_members: {
        Row: {
          community_id: string;
          user_id: string;
          role: "owner" | "member";
          status: "pending" | "joined" | "rejected" | "left";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          community_id: string;
          user_id: string;
          role?: "owner" | "member";
          status?: "pending" | "joined" | "rejected" | "left";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          community_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          status?: "pending" | "joined" | "rejected" | "left";
          created_at?: string;
          updated_at?: string;
        };
      };
      community_posts: {
        Row: {
          id: string;
          community_id: string;
          author_id: string;
          content: string;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          author_id: string;
          content: string;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          author_id?: string;
          content?: string;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      content_reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "listing" | "event" | "community" | "community_post";
          target_id: string;
          reason: "spam" | "scam" | "harassment" | "inappropriate" | "misleading" | "other";
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "listing" | "event" | "community" | "community_post";
          target_id: string;
          reason: "spam" | "scam" | "harassment" | "inappropriate" | "misleading" | "other";
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: "listing" | "event" | "community" | "community_post";
          target_id?: string;
          reason?: "spam" | "scam" | "harassment" | "inappropriate" | "misleading" | "other";
          note?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "market" | "events" | "community" | "system";
          title: string;
          message: string;
          link: string | null;
          payload: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "market" | "events" | "community" | "system";
          title: string;
          message: string;
          link?: string | null;
          payload?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "market" | "events" | "community" | "system";
          title?: string;
          message?: string;
          link?: string | null;
          payload?: Json;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type TableWithRelationships<T> = T extends {
  Row: infer Row;
  Insert: infer Insert;
  Update: infer Update;
}
  ? {
      Row: Row;
      Insert: Insert;
      Update: Update;
      Relationships: [];
    }
  : T;

export type Database = {
  public: {
    Tables: {
      [K in keyof DatabaseSchema["public"]["Tables"]]: TableWithRelationships<
        DatabaseSchema["public"]["Tables"][K]
      >;
    };
    Views: DatabaseSchema["public"]["Views"];
    Functions: DatabaseSchema["public"]["Functions"];
    Enums: DatabaseSchema["public"]["Enums"];
    CompositeTypes: DatabaseSchema["public"]["CompositeTypes"];
  };
};
