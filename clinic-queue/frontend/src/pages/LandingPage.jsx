import { Link } from 'react-router-dom';

function LandingPage() {
    return (
        <div className="text-center">
            {/* Hero Section */}
            <div className="mb-16">
                <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-500 tracking-tight">
                    Queueing as a Service
                </h2>
                <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
                    The most powerful queue management platform for salons, clinics, and modern businesses.
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Consumer Card */}
                <div className="bg-slate-800/50 p-10 rounded-3xl border border-slate-700/50 hover:border-indigo-500/40 transition-all group text-left shadow-xl shadow-black/20">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-105 transition-transform border border-indigo-500/20">
                        ⚡
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Book Services</h3>
                    <p className="text-slate-400 text-base mb-8 leading-relaxed">
                        Browse services, view wait times, and join the queue from your phone.
                    </p>
                    <Link to="/explore" className="inline-flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-2xl transition-all text-lg shadow-lg shadow-indigo-500/20">
                        Explore Directory →
                    </Link>
                </div>

                {/* Business Card */}
                <div className="bg-slate-800/30 p-10 rounded-3xl border border-slate-700/30 hover:border-emerald-500/30 transition-all group text-left shadow-xl shadow-black/20">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-105 transition-transform border border-emerald-500/20">
                        🏢
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">For Businesses</h3>
                    <p className="text-slate-500 text-base mb-8 leading-relaxed">
                        Digitize your intake and manage customer flow professionally.
                    </p>
                    <Link to="/signup" className="inline-flex items-center justify-center w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold py-4 px-8 rounded-2xl border border-emerald-500/30 transition-all text-lg hover:shadow-lg hover:shadow-emerald-500/10">
                        Get Started →
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LandingPage;
