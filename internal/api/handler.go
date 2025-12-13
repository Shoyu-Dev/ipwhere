package api

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/ip-lookup/ip-lookup/internal/geo"
)

// Handler holds the dependencies for HTTP handlers
type Handler struct {
	geoReader geo.ReaderInterface
}

// NewHandler creates a new Handler with the given geo reader
func NewHandler(geoReader geo.ReaderInterface) *Handler {
	return &Handler{
		geoReader: geoReader,
	}
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error       string `json:"error"`
	Attribution string `json:"attribution"`
}

// writeJSON writes a JSON response with the given status code
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// writeError writes an error response
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, ErrorResponse{
		Error:       message,
		Attribution: geo.Attribution,
	})
}

// getClientIP extracts the client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if parsedIP := net.ParseIP(ip); parsedIP != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		if parsedIP := net.ParseIP(xri); parsedIP != nil {
			return xri
		}
	}

	// Fall back to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// IPLookup godoc
// @Summary      Look up IP geolocation
// @Description  Returns geolocation data for the requesting IP or specified IP address
// @Tags         lookup
// @Accept       json
// @Produce      json
// @Param        ip      query     string  false  "IP address to lookup (defaults to client IP)"
// @Param        return  query     []string  false  "Fields to return (can be repeated). Valid values: country, iso_code, in_eu, city, region, latitude, longitude, timezone, asn, organization"
// @Success      200     {object}  geo.IPInfo
// @Failure      400     {object}  ErrorResponse
// @Failure      500     {object}  ErrorResponse
// @Router       /api/ip [get]
func (h *Handler) IPLookup(w http.ResponseWriter, r *http.Request) {
	// Get IP to lookup
	ipStr := r.URL.Query().Get("ip")
	if ipStr == "" {
		ipStr = getClientIP(r)
	}

	// Parse IP
	ip := net.ParseIP(ipStr)
	if ip == nil {
		writeError(w, http.StatusBadRequest, "Invalid IP address")
		return
	}

	// Lookup IP
	info, err := h.geoReader.Lookup(ip)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to lookup IP")
		return
	}

	// Check for field filtering
	returnFields := r.URL.Query()["return"]
	if len(returnFields) > 0 {
		// Normalize field names (convert to lowercase)
		normalizedFields := make([]string, len(returnFields))
		for i, f := range returnFields {
			normalizedFields[i] = strings.ToLower(f)
		}
		filtered := info.FilterFields(normalizedFields)
		writeJSON(w, http.StatusOK, filtered)
		return
	}

	writeJSON(w, http.StatusOK, info)
}

// Health godoc
// @Summary      Health check
// @Description  Returns health status of the service
// @Tags         health
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /health [get]
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
	})
}

// SetupRoutes configures the API routes
func (h *Handler) SetupRoutes(r chi.Router) {
	r.Get("/api/ip", h.IPLookup)
	r.Get("/health", h.Health)
}
