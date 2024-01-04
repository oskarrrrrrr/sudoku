package main

import (
    "fmt"
    "net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "how are you?")
}

func main() {
    http.HandleFunc("/api/hello", hello)
    fmt.Println("Server starting on port 9100...")
    if err := http.ListenAndServe(":9100", nil); err != nil {
        fmt.Println(err)
    }
}
