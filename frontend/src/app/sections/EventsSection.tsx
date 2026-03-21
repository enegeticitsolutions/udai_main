import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import eventsData from "../data/events.json";

export function EventsSection() {
  // Show first 3 events
  const upcomingEvents = eventsData.slice(0, 3);
  const futureRoadmap = eventsData.slice(3);

  return (
    <section className="py-16 sm:py-24 bg-white" id="events">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-gray-900">Upcoming Events</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join us in making a difference. Participate in our events and support our mission
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Events Cards */}
          <div className="lg:col-span-2 space-y-6">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group flex flex-col sm:flex-row"
              >
                <div className="sm:w-1/3 h-48 sm:h-auto relative overflow-hidden">
                  <ImageWithFallback
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-lg">
                    <div className="text-xs text-gray-600">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div className="text-2xl text-blue-600">
                      {new Date(event.date).getDate()}
                    </div>
                  </div>
                </div>

                <div className="sm:w-2/3 p-6">
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium mb-3">
                    {event.category}
                  </div>
                  <h3 className="text-xl mb-3 text-gray-900">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                  
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-4" />
                      <span>{event.attendees} attendees expected</span>
                    </div>
                  </div>

                  <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm group-hover:gap-3 transition-all">
                    Register Now
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Future Roadmap */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow-lg sticky top-24">
              <h3 className="text-2xl mb-6 text-gray-900">Future Roadmap</h3>
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-blue-200" />

                <div className="space-y-6">
                  {futureRoadmap.map((event, index) => (
                    <div key={event.id} className="relative pl-8">
                      <div className="absolute left-0 top-1 size-6 bg-blue-600 rounded-full border-4 border-blue-50" />
                      <div className="text-sm text-blue-600 font-medium mb-1">
                        {new Date(event.date).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{event.title}</h4>
                      <p className="text-sm text-gray-600">{event.location}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                View All Events
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
