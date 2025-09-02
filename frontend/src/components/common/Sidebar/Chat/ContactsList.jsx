import { useState } from 'react';
import { Search, UserPlus, Users, Filter, Phone, Video, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function ContactsList({ contacts, onContactSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'online' && contact.status === 'online') ||
      (filterStatus === 'offline' && contact.status !== 'online');
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
    case 'online': return 'bg-status-online';
    case 'away': return 'bg-status-away'; 
    case 'busy': return 'bg-status-busy';
    case 'offline': return 'bg-status-offline';
    default: return 'bg-status-offline';
    }
  };

  const getStatusText = (contact) => {
    switch (contact.status) {
      case 'online': return 'Đang hoạt động';
      case 'away': return `Hoạt động ${contact.lastSeen} trước`;
      case 'offline': return `Hoạt động ${contact.lastSeen} trước`;
      default: return 'Không xác định';
    }
  };

  const onlineCount = contacts.filter(c => c.status === 'online').length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bạn bè</h1>
            <p className="text-sm text-muted-foreground">
              {onlineCount} bạn đang hoạt động • {contacts.length} tổng số bạn bè
            </p>
          </div>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Thêm bạn
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Tìm kiếm bạn bè..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-input-border focus:border-input-focus"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            <Users className="w-4 h-4 mr-2" />
            Tất cả
          </Button>
          <Button
            variant={filterStatus === 'online' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('online')}
          >
            <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
            Đang online
          </Button>
          <Button
            variant={filterStatus === 'offline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('offline')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Offline
          </Button>
        </div>
      </div>

      {/* Online Friends */}
      {onlineCount > 0 && (
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            Đang hoạt động ({onlineCount})
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {contacts.filter(c => c.status === 'online').slice(0, 8).map(contact => (
              <div 
                key={contact.id}
                onClick={() => onContactSelect(contact)}
                className="flex flex-col items-center p-2 rounded-lg cursor-pointer hover:bg-card-hover transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-white"></div>
                </div>
                <span className="text-xs text-center mt-1 font-medium truncate w-full">{contact.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Contacts */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Tất cả bạn bè ({filteredContacts.length})
        </h3>
        <div className="space-y-2">
          {filteredContacts.map(contact => (
            <Card key={contact.id} className="hover:shadow-soft transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {getStatusText(contact)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContactSelect(contact);
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">Không tìm thấy bạn bè</h3>
            <p className="text-sm text-muted-foreground">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </p>
          </div>
        )}
      </div>
    </div>
  );
}