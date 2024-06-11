# Start with the official Go image for building
FROM golang:1.22.4 AS build-stage

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files
COPY bot/go.mod bot/go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source from the current directory to the Working Directory inside the container
COPY bot/*.go ./

# Build the Go app
RUN go build -o discord-bot .

# Start a new stage from scratch
FROM alpine:latest

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy the Pre-built binary file from the previous stage
COPY --from=build-stage /app/discord-bot .

# Command to run the executable
CMD ["./discord-bot"]