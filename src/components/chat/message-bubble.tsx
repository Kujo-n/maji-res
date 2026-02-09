import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
// import { Message } from "ai"; 

interface MessageBubbleProps {
  role: string;
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full gap-4 p-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar>
        <AvatarFallback>{isUser ? "U" : "M"}</AvatarFallback>
        {/* Placeholder image logic */}
        <AvatarImage src={isUser ? "" : "/magi-logo.png"} />
      </Avatar>
      <div className={cn("flex max-w-[80%] flex-col gap-2 rounded-lg p-3 text-sm", 
        isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
