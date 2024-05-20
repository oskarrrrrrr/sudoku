package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
)

const Domain = "oskarrrrrrr.xyz"

type MessageStream string

const (
	MessageStreamOutbound = "outbound"
)

type conentType string

const (
	ContentTypeJson = "application/json"
)

type Email struct {
	From          string `json:"From"`
	To            string `json:"To"`
	Subject       string `json:"Subject"`
	HtmlBody      string `json:"HtmlBody"`
	MessageStream string `json:"MessageStream"`
}

type EmailSender func(ctx context.Context, email Email) error

var ErrFailedToMakeEmailRequest = errors.New("Failed to make request to send email.")

func MockEmailSend(_ context.Context, _ Email) error {
	return nil
}

func GetPostmarkEmailSender(url, token string) EmailSender {
	client := http.DefaultClient

	type response struct {
		ErrorCode int `json:"ErrorCode"`
		// Example response:
		// "ErrorCode":0,
		// "Message":"OK",
		// "MessageID":"<uuid>",
		// "SubmittedAt":"2024-04-08T16:44:48.2249992Z",
		// "To":""
	}

	return func(ctx context.Context, email Email) error {
		body, err := json.Marshal(email)
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Add("Accept", ContentTypeJson)
		req.Header.Add("Content-Type", ContentTypeJson)
		req.Header.Add("X-Postmark-Server-Token", token)
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		log.Printf("status: %v", resp.StatusCode)
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		var response response
		err = json.Unmarshal(respBody, &response)
		if err != nil {
			log.Printf(string(respBody))
			return err
		}
		if response.ErrorCode == 0 {
			return nil
		}
		log.Printf(string(respBody))
		return ErrFailedToMakeEmailRequest
	}
}
