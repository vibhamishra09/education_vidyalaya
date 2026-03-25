import React from 'react';
import { View, Text, Image } from 'react-native';
import { Star, ThumbsUp } from 'lucide-react-native';

const REVIEWS = [
    { id: '1', reviewer: "Alice Wang", rating: 5, comment: "Great session! Explained the concepts very clearly.", date: "Jan 1, 2024", avatar: "https://i.pravatar.cc/150?u=alice" },
    { id: '2', reviewer: "Bob Smith", rating: 4, comment: "Very helpful and patient.", date: "Jan 5, 2024", avatar: "https://i.pravatar.cc/150?u=bob" },
    { id: '3', reviewer: "Charlie Brown", rating: 5, comment: "Awesome tutor! Would definitely book again.", date: "Jan 10, 2024", avatar: "https://i.pravatar.cc/150?u=charlie" },
    { id: '4', reviewer: "Dana White", rating: 5, comment: "Helped me understand Redux in no time.", date: "Jan 15, 2024", avatar: "https://i.pravatar.cc/150?u=dana" },
];

export function ReviewsTab() {
  const averageRating = (REVIEWS.reduce((acc, curr) => acc + curr.rating, 0) / REVIEWS.length).toFixed(1);

  return (
    <View className="px-4 pb-20">
      {/* Review Statistics */}
      <View className="bg-slate-900 dark:bg-white rounded-3xl p-6 mb-6">
         <View className="flex-row justify-between items-center">
             <View>
                 <Text className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-1">Average Rating</Text>
                 <View className="flex-row items-baseline gap-2">
                     <Text className="text-4xl font-bold text-white dark:text-slate-900">{averageRating}</Text>
                     <Text className="text-slate-400 dark:text-slate-500 text-sm">/ 5.0</Text>
                 </View>
                 <View className="flex-row gap-0.5 mt-2">
                     {[1, 2, 3, 4, 5].map((star) => (
                         <Star 
                            key={star} 
                            size={16} 
                            className={star <= Math.round(Number(averageRating)) ? "text-amber-400 fill-amber-400" : "text-slate-700 dark:text-slate-300"} 
                         />
                     ))}
                 </View>
             </View>
             <View className="bg-slate-800 dark:bg-slate-100 h-16 w-[1px] mx-4" />
             <View className="items-center">
                 <Text className="text-3xl font-bold text-white dark:text-slate-900">{REVIEWS.length}</Text>
                 <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">Total Reviews</Text>
             </View>
         </View>
      </View>

      {/* Reviews List */}
      <View>
         <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">All Reviews</Text>
         {REVIEWS.length === 0 ? (
             <View className="py-10 items-center">
                 <Text className="text-slate-500">No reviews yet.</Text>
             </View>
         ) : (
             REVIEWS.map((review) => (
                 <View key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3 shadow-sm">
                     <View className="flex-row items-start justify-between mb-3">
                         <View className="flex-row items-center gap-3">
                             <Image 
                                source={{ uri: review.avatar }} 
                                className="w-10 h-10 rounded-full bg-slate-200"
                             />
                             <View>
                                 <Text className="font-bold text-slate-900 dark:text-white">{review.reviewer}</Text>
                                 <Text className="text-xs text-slate-500">{review.date}</Text>
                             </View>
                         </View>
                         <View className="flex-row items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">
                             <Star size={12} className="text-amber-500 fill-amber-500 mr-1" />
                             <Text className="text-amber-700 dark:text-amber-400 font-bold text-xs">{review.rating}.0</Text>
                         </View>
                     </View>
                     <Text className="text-slate-600 dark:text-slate-300 leading-5 text-sm">{review.comment}</Text>
                 </View>
             ))
         )}
      </View>
    </View>
  );
}
