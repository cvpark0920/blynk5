import React from 'react';

interface QuickReply {
  labelKo: string;
  labelVn: string;
  labelEn?: string;
  messageKo?: string;
  messageVn?: string;
  messageEn?: string;
}

interface QuickActionsProps {
  replies: QuickReply[];
  language: 'ko' | 'vn' | 'en' | 'zh';
  onReply: (message: string) => void;
}

const getLabel = (reply: QuickReply, language: 'ko' | 'vn' | 'en' | 'zh') => {
  if (language === 'ko') return reply.labelKo;
  if (language === 'vn') return reply.labelVn;
  if (language === 'zh') return (reply as { labelZh?: string }).labelZh || reply.labelEn || reply.labelKo;
  return reply.labelEn || reply.labelKo;
};

const getMessage = (reply: QuickReply, language: 'ko' | 'vn' | 'en' | 'zh') => {
  if (language === 'ko') return reply.messageKo || reply.labelKo || '';
  if (language === 'vn') return reply.messageVn || reply.labelVn || '';
  if (language === 'zh') return (reply as { messageZh?: string }).messageZh || reply.messageEn || reply.labelEn || reply.labelKo || '';
  return reply.messageEn || reply.labelEn || reply.labelKo || '';
};

export const QuickActions: React.FC<QuickActionsProps> = ({ replies, language, onReply }) => {
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain py-3 px-4 bg-card/50 backdrop-blur-sm">
      {replies.length === 0 ? (
        <div className="text-sm text-muted-foreground px-2 py-1">
          상용구가 없습니다.
        </div>
      ) : (
        <div className="flex w-max min-w-full flex-nowrap gap-2">
          {replies.map((reply, index) => {
            const label = getLabel(reply, language);
            const message = getMessage(reply, language);
            return (
              <button
                key={`${label}-${index}`}
                onClick={() => onReply(message)}
                className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm border border-border active:scale-95 transition-all whitespace-nowrap group hover:border-primary/30 hover:bg-primary/10 shrink-0"
              >
                <span className="text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
