import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { motion } from "motion/react";
import { getImageUrl } from "../lib/imageUtils";

const VIDEOS = [
  {
    id: "voice-1",
    src: "/images/voice_of_changes1.mp4",
  },
  {
    id: "voice-2",
    src: "/images/voice_of_changes2.mp4",
  },
  {
    id: "voice-3",
    src: "/images/voice_of_changes3.mp4",
  },
];

function VoiceVideoCard({
  src,
  isMuted,
  onToggleMute,
}: {
  src: string;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div
      onClick={togglePlay}
      className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black cursor-pointer select-none group/video"
    >
      <video
        ref={videoRef}
        src={getImageUrl(src)}
        autoPlay
        loop
        muted
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="h-full w-full object-cover"
      />

      {/* Center Play Indicator when Paused */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-all">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#17120f] shadow-2xl transition hover:scale-110"
          >
            <Play className="h-7 w-7 fill-current translate-x-0.5" />
          </motion.div>
        </div>
      )}

      {/* Floating Mute/Unmute button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
        className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/85 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

export function TestimonialsSection() {
  const [unmutedId, setUnmutedId] = useState<string | null>(null);

  const handleToggleMute = (id: string) => {
    setUnmutedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="bg-[#f3f3f1] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-[#2b1b15] sm:text-5xl">
            Voices of <span className="text-[#2f5597]">Change</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-8 text-[#776a66]">
            Hear from the people who make our community vibrant and strong.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#e6ded7] bg-white p-3 shadow-[0_12px_28px_rgba(48,32,22,0.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(48,32,22,0.12)]"
            >
              <VoiceVideoCard
                src={video.src}
                isMuted={unmutedId !== video.id}
                onToggleMute={() => handleToggleMute(video.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


