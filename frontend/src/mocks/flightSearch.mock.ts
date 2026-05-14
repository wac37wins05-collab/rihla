/**
 * Flight Search — offline / demo fallback data.
 *
 * Used when:
 *  - No project is selected (no projectId to query)
 *  - The API call fails (network error, sandbox mode)
 *  - Development without a real Amadeus/Duffel API key
 *
 * Replace with real API results once Duffel/Amadeus is wired.
 */

export interface FlightResult {
  id: string
  airline: string
  airlineCode: string
  flightNumber: string
  departure: { airport: string; code: string; time: string; date: string }
  arrival:   { airport: string; code: string; time: string; date: string }
  duration: string
  stops: number
  stopCities: string[]
  price: number
  currency: string
  cabinClass: string
  seatsLeft: number
  baggage: string
  recommended: boolean
}

export const MOCK_FLIGHTS: FlightResult[] = [
  { id: 'f1', airline: 'Royal Air Maroc', airlineCode: 'AT', flightNumber: 'AT 789',   departure: { airport: 'Paris CDG',   code: 'CDG', time: '08:30', date: '2026-06-10' }, arrival: { airport: 'Casablanca CMN', code: 'CMN', time: '11:15', date: '2026-06-10' }, duration: '2h45', stops: 0, stopCities: [],              price: 245, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 8,  baggage: '23kg inclus',           recommended: true  },
  { id: 'f2', airline: 'Air France',      airlineCode: 'AF', flightNumber: 'AF 1498',  departure: { airport: 'Paris CDG',   code: 'CDG', time: '10:15', date: '2026-06-10' }, arrival: { airport: 'Casablanca CMN', code: 'CMN', time: '13:00', date: '2026-06-10' }, duration: '2h45', stops: 0, stopCities: [],              price: 312, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 15, baggage: '23kg inclus',           recommended: false },
  { id: 'f3', airline: 'Ryanair',         airlineCode: 'FR', flightNumber: 'FR 4521',  departure: { airport: 'Paris BVA',   code: 'BVA', time: '06:00', date: '2026-06-10' }, arrival: { airport: 'Marrakech RAK',  code: 'RAK', time: '08:50', date: '2026-06-10' }, duration: '2h50', stops: 0, stopCities: [],              price: 89,  currency: 'EUR', cabinClass: 'Economy', seatsLeft: 3,  baggage: 'Bagage cabine uniquement', recommended: false },
  { id: 'f4', airline: 'Transavia',       airlineCode: 'TO', flightNumber: 'TO 3456',  departure: { airport: 'Paris ORY',   code: 'ORY', time: '14:30', date: '2026-06-10' }, arrival: { airport: 'Marrakech RAK',  code: 'RAK', time: '17:20', date: '2026-06-10' }, duration: '2h50', stops: 0, stopCities: [],              price: 129, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 12, baggage: '20kg en option',        recommended: false },
  { id: 'f5', airline: 'Turkish Airlines',airlineCode: 'TK', flightNumber: 'TK 1819',  departure: { airport: 'Paris CDG',   code: 'CDG', time: '11:45', date: '2026-06-10' }, arrival: { airport: 'Casablanca CMN', code: 'CMN', time: '18:30', date: '2026-06-10' }, duration: '6h45', stops: 1, stopCities: ['Istanbul IST'], price: 198, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 22, baggage: '30kg inclus',           recommended: false },
  { id: 'f6', airline: 'Royal Air Maroc', airlineCode: 'AT', flightNumber: 'AT 791',   departure: { airport: 'Paris CDG',   code: 'CDG', time: '16:00', date: '2026-06-10' }, arrival: { airport: 'Casablanca CMN', code: 'CMN', time: '18:45', date: '2026-06-10' }, duration: '2h45', stops: 0, stopCities: [],              price: 275, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 5,  baggage: '23kg inclus',           recommended: false },
]

export const MOCK_RETURN_FLIGHTS: FlightResult[] = [
  { id: 'r1', airline: 'Royal Air Maroc', airlineCode: 'AT', flightNumber: 'AT 790',  departure: { airport: 'Casablanca CMN', code: 'CMN', time: '09:00', date: '2026-06-20' }, arrival: { airport: 'Paris CDG', code: 'CDG', time: '13:30', date: '2026-06-20' }, duration: '2h30', stops: 0, stopCities: [], price: 255, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 10, baggage: '23kg inclus', recommended: true  },
  { id: 'r2', airline: 'Air France',      airlineCode: 'AF', flightNumber: 'AF 1499', departure: { airport: 'Casablanca CMN', code: 'CMN', time: '14:30', date: '2026-06-20' }, arrival: { airport: 'Paris CDG', code: 'CDG', time: '19:00', date: '2026-06-20' }, duration: '2h30', stops: 0, stopCities: [], price: 298, currency: 'EUR', cabinClass: 'Economy', seatsLeft: 18, baggage: '23kg inclus', recommended: false },
]
