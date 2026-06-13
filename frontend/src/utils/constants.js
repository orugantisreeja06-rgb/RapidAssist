export const appName = 'Worker Connect'

export const serviceCategories = [
	{
		title: 'Electricians',
		description: 'Certified wiring, repairs, and installations.',
		icon: '⚡',
	},
	{
		title: 'Plumbers',
		description: 'Leak fixes, fittings, and pipe work.',
		icon: '🔧',
	},
	{
		title: 'Carpenters',
		description: 'Furniture, repairs, and wood finishing.',
		icon: '🪚',
	},
	{
		title: 'Painters',
		description: 'Interior, exterior, and decorative painting.',
		icon: '🎨',
	},
	{
		title: 'Masons',
		description: 'Bricklaying, flooring, and structural work.',
		icon: '🧱',
	},
	{
		title: 'Appliance Repair',
		description: 'Quick fixes for ACs, washing machines, and more.',
		icon: '🛠️',
	},
]

export const serviceTabs = [
	'Electrician',
	'Plumber',
	'Carpenter',
	'Painter',
	'Mason',
	'Appliance Repair',
]

export const availabilityFilters = ['Available now', 'Today', 'This week']

export const priceRanges = [
	{ label: 'Any price', value: '' },
	{ label: 'Under $25', value: '0-25' },
	{ label: '$25 - $50', value: '25-50' },
	{ label: '$50 - $100', value: '50-100' },
	{ label: 'Above $100', value: '100-9999' },
]

export const testimonials = [
	{
		name: 'Priya Sharma',
		role: 'Homeowner',
		quote: 'Booked a plumber in minutes and got live tracking all the way through.',
	},
	{
		name: 'Rohit Mehta',
		role: 'Apartment Owner',
		quote: 'The comparison filters made it easy to pick the right carpenter for the job.',
	},
	{
		name: 'Neha Khan',
		role: 'Property Manager',
		quote: 'The dashboard keeps all bookings, complaints, and notifications in one place.',
	},
]

export const bookingStatuses = ['Requested', 'Confirmed', 'In progress', 'Completed']

export const complaintStatuses = ['Open', 'In review', 'Resolved']

export const notificationTypes = ['booking', 'review', 'account', 'complaint']

export const defaultSearchFilters = {
	skill: '',
	location: '',
	rating: '',
	availability: '',
	priceRange: '',
}

export const chartPalette = ['#0f766e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444']
export const constants = {};

