import { useState } from "react";
import { Search, Filter, Star, Calendar, MapPin, Video } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion } from "motion/react";
import therapistsData from "../data/therapists.json";

export function TherapistsSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterMode, setFilterMode] = useState("All");

  const therapistTypes = ["All", "Occupational Therapist", "Speech Therapist", "Physical Therapist", "Behavioral Therapist", "Art Therapist", "Music Therapist"];
  const modes = ["All", "In-person", "Online", "Hybrid"];

  const filteredTherapists = therapistsData.filter((therapist) => {
    const matchesSearch = therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      therapist.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" || therapist.type === filterType;
    const matchesMode = filterMode === "All" || therapist.mode === filterMode;
    return matchesSearch && matchesType && matchesMode;
  });

  return (
    <section className="py-16 sm:py-24 bg-gray-50" id="therapists">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-gray-900">Our Therapists</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with experienced, compassionate professionals dedicated to your child's development
          </p>
        </motion.div>

        {/* Search and Filters */}
        <div className="mb-12 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex items-center gap-2">
              <Filter className="size-5 text-gray-600" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {therapistTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "All" ? "All Modes" : mode}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Therapist Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTherapists.map((therapist, index) => (
            <motion.div
              key={therapist.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
            >
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback
                  src={therapist.image}
                  alt={therapist.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-white rounded-full text-sm font-medium flex items-center gap-1">
                  <Star className="size-4 text-yellow-500 fill-yellow-500" />
                  {therapist.rating}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl mb-1 text-gray-900">{therapist.name}</h3>
                <p className="text-blue-600 mb-4 text-sm font-medium">{therapist.specialization}</p>

                <div className="space-y-2 mb-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <span>{therapist.experience} experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {therapist.mode === "Online" ? (
                      <Video className="size-4" />
                    ) : (
                      <MapPin className="size-4" />
                    )}
                    <span>{therapist.mode}</span>
                  </div>
                  <div className="text-emerald-600 font-medium">
                    Available: {therapist.availableSlot}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Book Session
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                    View Profile
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredTherapists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No therapists found matching your criteria.</p>
          </div>
        )}
      </div>
    </section>
  );
}
