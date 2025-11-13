import axios from 'axios';

// Photon-based geocoding utility - Best free solution
export const geocodingUtils = {
    
    // Forward geocoding - Convert address to coordinates
    forwardGeocode: async (address) => {
        try {
            if (!address || address.trim().length < 2) {
                throw new Error('Address parameter required (min 2 characters)');
            }

            const searchTerm = address.trim();
            console.log('🔍 Photon forward geocoding for:', searchTerm);

            // Multiple search strategies for best results
            const searchStrategies = [
                // Strategy 1: Exact search
                {
                    name: 'Exact',
                    params: {
                        q: searchTerm,
                        limit: 8,
                        lang: 'en'
                    }
                },
                // Strategy 2: Focus on places (cities, towns)
                {
                    name: 'Places',
                    params: {
                        q: searchTerm,
                        limit: 5,
                        osm_tag: 'place',
                        lang: 'en'
                    }
                },
                // Strategy 3: Focus on addresses
                {
                    name: 'Addresses',
                    params: {
                        q: searchTerm,
                        limit: 5,
                        osm_tag: 'highway',
                        lang: 'en'
                    }
                }
            ];

            let allResults = [];
            let strategiesUsed = 0;

            for (const strategy of searchStrategies) {
                try {
                    console.log(`🌐 Trying Photon ${strategy.name} strategy`);
                    
                    const response = await axios.get('https://photon.komoot.io/api', {
                        params: strategy.params,
                        timeout: 8000
                    });

                    if (response.data.features && response.data.features.length > 0) {
                        strategiesUsed++;
                        
                        // Convert Photon format to standard format
                        const convertedResults = response.data.features.map(feature => {
                            const props = feature.properties;
                            const coords = feature.geometry.coordinates;
                            
                            // Build display name intelligently
                            let displayName = '';
                            if (props.name) {
                                displayName = props.name;
                                if (props.city && props.city !== props.name) {
                                    displayName += `, ${props.city}`;
                                }
                                if (props.state) {
                                    displayName += `, ${props.state}`;
                                }
                                if (props.country) {
                                    displayName += `, ${props.country}`;
                                }
                            } else if (props.street) {
                                displayName = props.street;
                                if (props.city) displayName += `, ${props.city}`;
                                if (props.state) displayName += `, ${props.state}`;
                            } else {
                                displayName = `${props.city || props.state || props.country || 'Unknown location'}`;
                            }

                            return {
                                place_id: props.osm_id || Math.random().toString(36),
                                display_name: displayName,
                                lat: coords[1].toString(),
                                lon: coords[0].toString(),
                                address: {
                                    house_number: props.housenumber,
                                    road: props.street,
                                    suburb: props.district,
                                    city: props.city || props.town || props.village,
                                    state: props.state,
                                    postcode: props.postcode,
                                    country: props.country
                                },
                                importance: strategy.name === 'Exact' ? 0.9 : 
                                           strategy.name === 'Places' ? 0.8 : 0.7,
                                source: 'photon',
                                strategy: strategy.name
                            };
                        });
                        
                        allResults.push(...convertedResults);
                        console.log(`✅ Photon ${strategy.name} found ${convertedResults.length} results`);
                    }
                } catch (error) {
                    console.warn(`❌ Photon ${strategy.name} strategy failed:`, error.message);
                }
            }

            // Remove duplicates and sort by relevance
            const uniqueResults = [];
            const seenDisplayNames = new Set();

            allResults
                .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                .forEach(result => {
                    const key = result.display_name.toLowerCase();
                    if (!seenDisplayNames.has(key)) {
                        seenDisplayNames.add(key);
                        uniqueResults.push(result);
                    }
                });

            // Limit to top 8 results
            const finalResults = uniqueResults.slice(0, 8);
            
            console.log(`📊 Photon combined: ${finalResults.length} unique results from ${strategiesUsed} strategies`);
            
            return { data: finalResults };

        } catch (error) {
            console.error('❌ Forward geocoding failed:', error.message);
            throw new Error('Geocoding service error');
        }
    },

    // Reverse geocoding - Convert coordinates to address
    reverseGeocode: async (lat, lng) => {
        try {
            if (!lat || !lng) {
                throw new Error('Latitude and longitude required');
            }

            console.log('🔍 Photon reverse geocoding for:', { lat, lng });

            const response = await axios.get(`https://photon.komoot.io/reverse`, {
                params: {
                    lat: lat,
                    lon: lng,
                    limit: 1
                },
                timeout: 8000
            });

            if (response.data.features && response.data.features.length > 0) {
                const feature = response.data.features[0];
                const result = {
                    display_name: feature.properties.name || 'Unknown location',
                    lat: feature.geometry.coordinates[1],
                    lon: feature.geometry.coordinates[0],
                    address: {
                        house_number: feature.properties.housenumber,
                        road: feature.properties.street,
                        city: feature.properties.city,
                        state: feature.properties.state,
                        postcode: feature.properties.postcode,
                        country: feature.properties.country
                    }
                };

                console.log('✅ Reverse geocoding successful');
                return { data: result };
            } else {
                console.log('❌ No reverse geocoding results found');
                return { data: null };
            }

        } catch (error) {
            console.error('❌ Reverse geocoding failed:', error.message);
            throw new Error('Reverse geocoding failed');
        }
    },

    // Calculate distance between two coordinates (Haversine formula)
    calculateDistance: (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return Math.round(distance * 10) / 10; // Round to 1 decimal place
    },

    // Validate coordinates
    isValidCoordinates: (lat, lng) => {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        return !isNaN(latitude) && 
               !isNaN(longitude) && 
               latitude >= -90 && 
               latitude <= 90 && 
               longitude >= -180 && 
               longitude <= 180;
    }
};
