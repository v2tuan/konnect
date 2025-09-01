import { useState } from 'react';
import { Camera, Edit3, MapPin, Calendar, Phone, Mail, Settings, Image, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const mockPosts = [
  {
    id: '1',
    content: 'Hôm nay thời tiết đẹp quá! Đi chụp ảnh với bạn bè 📸',
    timestamp: '2 giờ trước',
    likes: 12,
    comments: 3,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  },
  {
    id: '2', 
    content: 'Vừa thử món mới ở quán cafe gần nhà, ngon lắm! 🍰☕',
    timestamp: '1 ngày trước', 
    likes: 8,
    comments: 2
  },
  {
    id: '3',
    content: 'Cuối tuần này có ai rảnh đi xem phim không? 🎬',
    timestamp: '3 ngày trước',
    likes: 5,
    comments: 7
  }
];

export function UserProfile() {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Cover Photo & Avatar */}
      <div className="relative">
        <div className="h-48 bg-gradient-primary"></div>
        <div className="absolute -bottom-16 left-8">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-card shadow-medium">
              <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face" />
              <AvatarFallback>TN</AvatarFallback>
            </Avatar>
            <Button 
              size="sm" 
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full p-0 shadow-medium"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button 
          variant="secondary" 
          className="absolute top-4 right-4 shadow-medium"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Chỉnh sửa
        </Button>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-8 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Trần Nam</h1>
            <p className="text-muted-foreground mb-2">Software Developer</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Hà Nội, Việt Nam
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Tham gia tháng 3/2021
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-success/20 text-success">
              <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
              Đang hoạt động
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">127</div>
              <div className="text-sm text-muted-foreground">Bạn bè</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">89</div>
              <div className="text-sm text-muted-foreground">Bài viết</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">1.2K</div>
              <div className="text-sm text-muted-foreground">Lượt thích</div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <Card className="mb-6">
          <CardHeader>
            <h3 className="font-semibold">Thông tin liên hệ</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>+84 123 456 789</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>tran.nam@example.com</span>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6">
          <Button
            variant={activeTab === 'posts' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('posts')}
          >
            Bài viết
          </Button>
          <Button
            variant={activeTab === 'photos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('photos')}
          >
            <Image className="w-4 h-4 mr-2" />
            Ảnh
          </Button>
          <Button
            variant={activeTab === 'info' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('info')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Thông tin
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {mockPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-medium transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face" />
                      <AvatarFallback>TN</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Trần Nam</span>
                        <span className="text-sm text-muted-foreground">{post.timestamp}</span>
                      </div>
                      <p className="text-sm mb-3">{post.content}</p>
                      
                      {post.image && (
                        <div className="mb-3">
                          <img 
                            src={post.image} 
                            alt="Post image" 
                            className="rounded-lg w-full max-h-64 object-cover"
                          />
                        </div>
                      )}

                      <Separator className="mb-3" />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                            <Heart className="w-4 h-4 mr-1" />
                            {post.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.comments}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        )}

        {activeTab === 'info' && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Giới thiệu</h4>
                  <p className="text-sm text-muted-foreground">
                    Là một lập trình viên đam mê công nghệ, thích tìm hiểu những điều mới và chia sẻ kiến thức với mọi người.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Sở thích</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Công nghệ', 'Du lịch', 'Âm nhạc', 'Thể thao', 'Đọc sách'].map((hobby) => (
                      <Badge key={hobby} variant="secondary">{hobby}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}