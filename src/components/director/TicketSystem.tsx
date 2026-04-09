import React, { useCallback, useState, useEffect, useRef } from "react";
import {
    Plus,
    Search,
    MessageSquare,
    Send,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreVertical,
    Paperclip,
    ChevronRight,
    Filter,
    ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { enUS, ru, uz } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/context/LanguageContext";

interface Ticket {
    _id: string;
    title: string;
    description: string;
    status: "open" | "in_progress" | "closed";
    priority: "low" | "medium" | "high";
    createdBy: { _id: string; name: string; role: string; photoUrl?: string };
    assignedTo?: { _id: string; name: string; role: string; photoUrl?: string };
    createdAt: string;
    updatedAt: string;
}

interface Message {
    _id: string;
    content: string;
    sender: { _id: string; name: string; role: string; photoUrl?: string };
    createdAt: string;
}

interface TicketSystemProps {
    token: string | null;
    userRole: "director" | "school_admin";
    API_BASE_URL: string;
}

const TicketSystem = ({ token, userRole, API_BASE_URL }: TicketSystemProps) => {
    const { t } = useTranslation("director-tickets");
    const { language } = useAppLanguage();
    const { toast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTicketTitle, setNewTicketTitle] = useState("");
    const [newTicketDescription, setNewTicketDescription] = useState("");
    const [newTicketPriority, setNewTicketPriority] = useState<"low" | "medium" | "high">("medium");

    const scrollRef = useRef<HTMLDivElement>(null);
    const dateLocale = language === "ru" ? ru : language === "en" ? enUS : uz;
    const getErrorMessage = useCallback(
        (err: unknown) => (err instanceof Error ? err.message : t("toasts.error")),
        [t],
    );

    const submitMessage = async () => {
        if (!token || !selectedTicket || !newMessage.trim()) return;

        const res = await fetch(`${API_BASE_URL}/api/tickets/${selectedTicket._id}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ content: newMessage }),
        });

        if (!res.ok) throw new Error(t("errors.sendFailed"));

        setNewMessage("");
        fetchTicketDetails(selectedTicket._id);
    };

    const fetchTickets = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tickets`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setTickets(Array.isArray(data) ? data : []);
        } catch (err: unknown) {
            toast({ title: t("toasts.error"), description: getErrorMessage(err), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, getErrorMessage, token, toast]);

    const fetchTicketDetails = async (ticketId: string) => {
        if (!token) return;
        setLoadingMessages(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSelectedTicket(data);
            setMessages(data.messages || []);
        } catch (err: unknown) {
            toast({ title: t("toasts.error"), description: getErrorMessage(err), variant: "destructive" });
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tickets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTicketTitle,
                    description: newTicketDescription,
                    priority: newTicketPriority
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t("errors.createFailed"));
            toast({ title: t("toasts.success"), description: t("toasts.created") });
            setIsCreateDialogOpen(false);
            setNewTicketTitle("");
            setNewTicketDescription("");
            fetchTickets();
        } catch (err: unknown) {
            toast({ title: t("toasts.error"), description: getErrorMessage(err), variant: "destructive" });
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submitMessage();
        } catch (err: unknown) {
            toast({ title: t("toasts.error"), description: getErrorMessage(err), variant: "destructive" });
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!token || !selectedTicket || userRole !== "school_admin") return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tickets/${selectedTicket._id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error(t("errors.statusChangeFailed"));
            toast({ title: t("toasts.updated"), description: t("toasts.statusUpdated") });
            fetchTicketDetails(selectedTicket._id);
            fetchTickets();
        } catch (err: unknown) {
            toast({ title: t("toasts.error"), description: getErrorMessage(err), variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "open": return <Badge variant="outline" className="text-blue-500 border-blue-500">{t("status.open")}</Badge>;
            case "in_progress": return <Badge variant="outline" className="text-amber-500 border-amber-500">{t("status.in_progress")}</Badge>;
            case "closed": return <Badge variant="outline" className="text-emerald-500 border-emerald-500">{t("status.closed")}</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "high": return <Badge className="bg-red-500 text-[10px] h-4 px-1">{t("priority.high")}</Badge>;
            case "medium": return <Badge className="bg-amber-500 text-[10px] h-4 px-1">{t("priority.medium")}</Badge>;
            case "low": return <Badge className="bg-blue-500 text-[10px] h-4 px-1">{t("priority.low")}</Badge>;
            default: return null;
        }
    };

    const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).sub : "";

    return (
        <div className="flex h-[calc(100vh-12rem)] flex-col gap-6 lg:flex-row">
            {/* Ticket List */}
            <Card className="flex w-full flex-col overflow-hidden lg:w-96 shrink-0">
                <CardHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t("title")}</CardTitle>
                        {userRole === "director" && (
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-8 w-8 p-0 rounded-full">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t("dialogs.createTitle")}</DialogTitle>
                                        <DialogDescription>
                                            {t("dialogs.createDescription")}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateTicket} className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">{t("dialogs.titleLabel")}</Label>
                                            <Input
                                                id="title"
                                                value={newTicketTitle}
                                                onChange={(e) => setNewTicketTitle(e.target.value)}
                                                placeholder={t("dialogs.titlePlaceholder")}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">{t("dialogs.descriptionLabel")}</Label>
                                            <Textarea
                                                id="description"
                                                value={newTicketDescription}
                                                onChange={(e) => setNewTicketDescription(e.target.value)}
                                                placeholder={t("dialogs.descriptionPlaceholder")}
                                                className="min-h-[100px]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("dialogs.priorityLabel")}</Label>
                                            <Select
                                                value={newTicketPriority}
                                                onValueChange={(v) => setNewTicketPriority(v as "low" | "medium" | "high")}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="low">{t("priority.low")}</SelectItem>
                                                    <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                                                    <SelectItem value="high">{t("priority.high")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">{t("dialogs.submit")}</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("searchPlaceholder")}
                                className="pl-9 h-9 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                            <Button
                                variant={statusFilter === "all" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-[10px] px-2 rounded-full"
                                onClick={() => setStatusFilter("all")}
                            >
                                {t("filters.all")}
                            </Button>
                            <Button
                                variant={statusFilter === "open" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-[10px] px-2 rounded-full"
                                onClick={() => setStatusFilter("open")}
                            >
                                {t("filters.open")}
                            </Button>
                            <Button
                                variant={statusFilter === "in_progress" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-[10px] px-2 rounded-full"
                                onClick={() => setStatusFilter("in_progress")}
                            >
                                {t("filters.inProgress")}
                            </Button>
                            <Button
                                variant={statusFilter === "closed" ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-[10px] px-2 rounded-full"
                                onClick={() => setStatusFilter("closed")}
                            >
                                {t("filters.closed")}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-auto">
                    <ScrollArea className="h-full">
                        {loading ? (
                            <div className="flex flex-col gap-4 p-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                                ))}
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <MessageSquare className="mb-2 h-8 w-8 opacity-20" />
                                <p className="text-sm">{t("empty.list")}</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredTickets.map((ticket) => (
                                    <button
                                        key={ticket._id}
                                        onClick={() => fetchTicketDetails(ticket._id)}
                                        className={`flex w-full flex-col gap-1 p-4 text-left transition hover:bg-muted/50 ${selectedTicket?._id === ticket._id ? "bg-muted shadow-inner border-l-2 border-primary" : ""
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            {getPriorityBadge(ticket.priority)}
                                            <span className="text-[10px] text-muted-foreground">
                                                {format(new Date(ticket.createdAt), "dd.MM.yyyy", { locale: dateLocale })}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-sm line-clamp-1">{ticket.title}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</span>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <Avatar className="h-5 w-5 border border-background">
                                                    <AvatarImage src={ticket.createdBy.photoUrl} alt="" className="object-cover" />
                                                    <AvatarFallback className="text-[8px] bg-primary/10">
                                                        {ticket.createdBy.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] text-muted-foreground truncate">{ticket.createdBy.name}</span>
                                            </div>
                                            {getStatusBadge(ticket.status)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Main Chat Area */}
            <Card className="flex flex-1 flex-col overflow-hidden bg-background">
                {!selectedTicket ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
                        <div className="rounded-full bg-muted p-6">
                            <MessageSquare className="h-12 w-12 opacity-40" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mt-4">{t("empty.selectTitle")}</h3>
                        <p className="max-w-[300px] text-sm font-murojaat">
                            {t("empty.selectDescription")}
                        </p>
                    </div>
                ) : (
                    <>
                        <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-white z-10">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {getPriorityBadge(selectedTicket.priority)}
                                    <CardTitle className="text-base">{selectedTicket.title}</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    {t("chat.idPrefix")}: {selectedTicket._id.substring(18)}... • {format(new Date(selectedTicket.createdAt), "d MMMM, HH:mm", { locale: dateLocale })}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {userRole === "school_admin" ? (
                                    <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="open">{t("status.open")}</SelectItem>
                                            <SelectItem value="in_progress">{t("status.in_progress")}</SelectItem>
                                            <SelectItem value="closed">{t("status.close")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    getStatusBadge(selectedTicket.status)
                                )}
                            </div>
                        </CardHeader>
                        <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
                            <ScrollArea className="flex-1 p-4">
                                <div className="flex flex-col gap-4 pb-4">
                                    {/* Original Description */}
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] rounded-2xl bg-white p-4 shadow-sm border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={selectedTicket.createdBy.photoUrl} alt="" className="object-cover" />
                                                    <AvatarFallback className="text-[10px] bg-primary/20">{selectedTicket.createdBy.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-semibold">{selectedTicket.createdBy.name}</span>
                                                <Badge variant="secondary" className="text-[8px] h-4 px-1">{t("sender.director")}</Badge>
                                            </div>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                                        </div>
                                    </div>

                                    {messages.map((msg) => {
                                        const isMe = msg.sender._id === currentUserId;
                                        return (
                                            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border rounded-tl-none"
                                                    }`}>
                                                    {!isMe && (
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarImage src={msg.sender.photoUrl} alt="" className="object-cover" />
                                                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                                                    {msg.sender.name.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[10px] font-medium opacity-70">{msg.sender.name}</span>
                                                        </div>
                                                    )}
                                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                    <span className={`mt-1 block text-[8px] text-right ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                        {format(new Date(msg.createdAt), "HH:mm")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {loadingMessages && (
                                        <div className="flex justify-center p-4">
                                            <Clock className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                        {selectedTicket.status !== "closed" ? (
                            <CardFooter className="p-4 border-t bg-white">
                                <form onSubmit={handleSendMessage} className="flex w-full items-end gap-2">
                                    <div className="relative flex-1">
                                        <Textarea
                                            placeholder={t("chat.messagePlaceholder")}
                                            className="min-h-[44px] max-h-32 resize-none pr-10 py-3 rounded-xl border-slate-200 focus-visible:ring-primary/20"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    void submitMessage().catch((err: unknown) => {
                                                        toast({
                                                            title: t("toasts.error"),
                                                            description: getErrorMessage(err),
                                                            variant: "destructive",
                                                        });
                                                    });
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 bottom-1.5 h-8 w-8 text-muted-foreground"
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="h-11 w-11 rounded-xl shrink-0"
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                </form>
                            </CardFooter>
                        ) : (
                            <CardFooter className="p-4 border-t bg-slate-100 justify-center">
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                    <ShieldAlert className="h-4 w-4" />
                                    {t("chat.closedNotice")}
                                </div>
                            </CardFooter>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

export default TicketSystem;
