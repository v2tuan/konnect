import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"

function HeroKonnect({
  heading = "Konnect — Chat App v1",
  description = "Nhắn tin thời gian thực, nhóm chat linh hoạt, gửi file nhanh, và đồng bộ đa thiết bị. Bắt đầu trò chuyện với tốc độ siêu mượt ngay hôm nay.",
  button = {
    text: "Bắt đầu với Konnect",
    url: "/signup"
  },
  reviews = {
    count: 1200,
    rating: 4.9,
    avatars: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
        alt: "Avatar 1"
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
        alt: "Avatar 2"
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
        alt: "Avatar 3"
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
        alt: "Avatar 4"
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
        alt: "Avatar 5"
      }
    ]
  }
}) {
  return (
    <section className="min-h-[100svh] grid place-items-center px-4 py-16">
      <div className="container text-center">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <h1 className="text-3xl font-extrabold lg:text-6xl">{heading}</h1>
          <p className="text-muted-foreground text-balance lg:text-lg">
            {description}
          </p>
        </div>

        <Button asChild size="lg" className="mt-10">
          <a href={button.url}>{button.text}</a>
        </Button>

        <div className="mx-auto mt-10 flex w-fit flex-col items-center gap-4 sm:flex-row">
          <span className="mx-4 inline-flex items-center -space-x-4">
            {reviews.avatars.map((avatar, index) => (
              <Avatar key={index} className="size-14 border">
                <AvatarImage src={avatar.src} alt={avatar.alt} />
              </Avatar>
            ))}
          </span>

          <div className="text-left">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, index) => (
                <Star key={index} className="size-5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 mr-1 font-semibold">
                {Number(reviews.rating ?? 0).toFixed(1)}
              </span>
            </div>
            <p className="text-muted-foreground font-medium">
              từ {reviews.count}+ người dùng yêu thích
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroKonnect
export { HeroKonnect }
