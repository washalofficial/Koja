
import { Video, User } from './types';

// --- MOCK USERS ---

const USER_TRAVEL = {
  id: 'u_travel',
  username: 'wandering_elena',
  fullName: 'Elena Rodriguez ✈️',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  followers: 45200,
};

const USER_FOOD = {
  id: 'u_food',
  username: 'chef_rajiv',
  fullName: 'Rajivs Kitchen 🥘',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
  followers: 120500,
};

const USER_FITNESS = {
  id: 'u_fit',
  username: 'fitness_with_mike',
  fullName: 'Iron Mike 💪',
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
  followers: 8900,
};

const USER_ART = {
  id: 'u_art',
  username: 'art_by_sophia',
  fullName: 'Sophia Arts 🎨',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
  followers: 23000,
};

const USER_COMEDY = {
  id: 'u_comedy',
  username: 'just_joking',
  fullName: 'Sam The Prankster',
  avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop',
  followers: 670000,
};

const USER_PETS = {
  id: 'u_pets',
  username: 'golden_bailey',
  fullName: 'Bailey The Retriever 🐕',
  avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
  followers: 1200000,
};

const USER_TECH = {
  id: 'u_tech',
  username: 'gadget_guru',
  fullName: 'Tech Reviews Daily',
  avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150&h=150&fit=crop',
  followers: 55000,
};

// --- FOLLOWED USERS (Simulated) ---
// The current user follows the Travel and Food accounts
export const FOLLOWED_USER_IDS = [USER_TRAVEL.id, USER_FOOD.id];

// --- MOCK VIDEOS ---

export const MOCK_VIDEOS: Video[] = [
  {
    id: 'v1',
    userId: USER_TRAVEL.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=600&fit=crop',
    caption: 'POV: You quit your job to travel the world 🌎✨ #travel #wanderlust #freedom',
    hashtags: ['travel', 'wanderlust', 'fyp'],
    likesCount: 12400,
    commentsCount: 450,
    sharesCount: 120,
    viewsCount: 154000,
    songName: 'Runaway - Galantis',
    user: USER_TRAVEL,
  },
  {
    id: 'v2',
    userId: USER_FOOD.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=600&fit=crop',
    caption: 'Secret spice blend revealed! 🌶️🍛 Wait for the sizzle... #foodie #cooking #recipe',
    hashtags: ['foodie', 'indianfood', 'chef'],
    likesCount: 8900,
    commentsCount: 340,
    sharesCount: 890,
    viewsCount: 95000,
    songName: 'Spicy Beats - Original Audio',
    user: USER_FOOD,
  },
  {
    id: 'v3',
    userId: USER_PETS.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=600&fit=crop',
    caption: 'He thought he was hiding... 😂🐶 #dogsoftiktok #funny #cute',
    hashtags: ['dogs', 'cute', 'goldenretriever'],
    likesCount: 250000,
    commentsCount: 1200,
    sharesCount: 5000,
    viewsCount: 1200000,
    songName: 'Funny Song - Cavendish Music',
    user: USER_PETS,
  },
  {
    id: 'v4',
    userId: USER_FITNESS.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=600&fit=crop',
    caption: 'No excuses. 5AM Club. Let’s get it! 💪😤 #gymmotivation #fitness #grind',
    hashtags: ['gym', 'motivation', 'workout'],
    likesCount: 4500,
    commentsCount: 120,
    sharesCount: 45,
    viewsCount: 32000,
    songName: 'Eye of the Tiger - Survivor',
    user: USER_FITNESS,
  },
  {
    id: 'v5',
    userId: USER_ART.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=600&fit=crop',
    caption: 'Trust the process... Final reveal at the end! 🎨✨ #art #painting #satisfying',
    hashtags: ['art', 'drawing', 'satisfying'],
    likesCount: 67000,
    commentsCount: 890,
    sharesCount: 2100,
    viewsCount: 510000,
    songName: 'LoFi Study Beats',
    user: USER_ART,
  },
  {
    id: 'v6',
    userId: USER_COMEDY.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&h=600&fit=crop',
    caption: 'Me trying to explain my code to my boss 🤡💀 #coding #corporate #funny',
    hashtags: ['relatable', 'worklife', 'comedy'],
    likesCount: 15000,
    commentsCount: 230,
    sharesCount: 400,
    viewsCount: 89000,
    songName: 'Oh No - Kreepa',
    user: USER_COMEDY,
  },
  {
    id: 'v7',
    userId: USER_TECH.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&h=600&fit=crop',
    caption: 'Is this the future of gaming? 🕹️🕶️ VR setup tour! #tech #gaming #setup',
    hashtags: ['tech', 'vr', 'gaming'],
    likesCount: 34000,
    commentsCount: 900,
    sharesCount: 1200,
    viewsCount: 250000,
    songName: 'Cyberpunk Theme',
    user: USER_TECH,
  },
  {
    id: 'v8',
    userId: USER_TRAVEL.id,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=600&fit=crop',
    caption: 'Switzerland or Heaven? 🏔️🇨🇭 You decide. #nature #switzerland #peace',
    hashtags: ['nature', 'travelbucketlist'],
    likesCount: 98000,
    commentsCount: 2100,
    sharesCount: 15000,
    viewsCount: 800000,
    songName: 'Pure Imagination - Lofi',
    user: USER_TRAVEL,
  },
];
