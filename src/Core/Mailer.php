<?php

declare(strict_types=1);

namespace FixMyCampus\Core;

/**
 * FixMyCampus SMTP Mailer
 *
 * Standalone pure-PHP socket SMTP client supporting STARTTLS, SSL, and authentication.
 * Requires no external Composer packages.
 */
class Mailer
{
    private static ?string $lastError = null;

    /**
     * Retrieve the last recorded error message.
     */
    public static function getLastError(): ?string
    {
        return self::$lastError;
    }

    /**
     * Send an email via SMTP.
     *
     * @param string $to Recipient email address
     * @param string $subject Email subject line
     * @param string $htmlBody HTML content
     * @param string $textBody Plain-text fallback content
     * @return bool True on success, false on failure
     */
    public static function send(string $to, string $subject, string $htmlBody, string $textBody = ''): bool
    {
        self::$lastError = null;

        $host       = Env::get('SMTP_HOST', '');
        $port       = (int) Env::get('SMTP_PORT', 587);
        $encryption = strtolower(Env::get('SMTP_ENCRYPTION', 'tls'));
        $username   = Env::get('SMTP_USERNAME', '');
        $password   = Env::get('SMTP_PASSWORD', '');
        $fromEmail  = Env::get('SMTP_FROM_EMAIL', 'no-reply@fixmycampus.edu');
        $fromName   = Env::get('SMTP_FROM_NAME', 'FixMyCampus - PHINMA Education');

        if (empty($host)) {
            self::$lastError = 'SMTP_HOST is not configured in .env';
            return false;
        }

        $timeout = 10;
        $connectionPrefix = ($encryption === 'ssl') ? 'ssl://' : '';
        $remoteAddress = $connectionPrefix . $host . ':' . $port;

        $context = stream_context_create([
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            ],
        ]);

        $errno = 0;
        $errstr = '';
        $socket = @stream_socket_client(
            $remoteAddress,
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if (!$socket) {
            self::$lastError = "Failed to connect to SMTP server {$remoteAddress}: {$errstr} (code: {$errno})";
            return false;
        }

        stream_set_timeout($socket, $timeout);

        try {
            // Read initial greeting banner
            $response = self::readResponse($socket);
            if (!str_starts_with($response, '220')) {
                throw new \RuntimeException("Unexpected SMTP greeting: {$response}");
            }

            $clientDomain = 'localhost';
            self::sendCommand($socket, "EHLO {$clientDomain}", '250');

            // Handle STARTTLS
            if ($encryption === 'tls') {
                self::sendCommand($socket, 'STARTTLS', '220');

                $cryptoSuccess = @stream_socket_enable_crypto(
                    $socket,
                    true,
                    STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT
                );

                if (!$cryptoSuccess) {
                    throw new \RuntimeException('Failed to establish TLS encryption with SMTP server.');
                }

                // Resend EHLO after TLS handshake
                self::sendCommand($socket, "EHLO {$clientDomain}", '250');
            }

            // Authenticate if credentials provided
            if (!empty($username) && !empty($password)) {
                self::sendCommand($socket, 'AUTH LOGIN', '334');
                self::sendCommand($socket, base64_encode($username), '334');
                self::sendCommand($socket, base64_encode($password), '235');
            }

            // Sender and Recipient
            self::sendCommand($socket, "MAIL FROM:<{$fromEmail}>", '250');
            self::sendCommand($socket, "RCPT TO:<{$to}>", '250');

            // DATA
            self::sendCommand($socket, 'DATA', '354');

            // Construct MIME message
            $boundary = '=_FixMyCampus_' . md5((string) microtime(true));
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $messageId = '<' . md5(uniqid((string)mt_rand(), true)) . '@' . (gethostname() ?: 'fixmycampus.edu') . '>';

            $headers = [
                "Date: " . date('r'),
                "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>",
                "To: <{$to}>",
                "Subject: {$encodedSubject}",
                "Message-ID: {$messageId}",
                "MIME-Version: 1.0",
                "Content-Type: multipart/alternative; boundary=\"{$boundary}\"",
                "X-Mailer: FixMyCampus-PHINMAED-Mailer/1.0",
            ];

            if (empty($textBody)) {
                $textBody = strip_tags($htmlBody);
            }

            $body  = implode("\r\n", $headers) . "\r\n\r\n";
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($textBody)) . "\r\n";

            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";

            $body .= "--{$boundary}--\r\n";
            $body .= ".\r\n";

            fwrite($socket, $body);
            $dataResponse = self::readResponse($socket);
            if (!str_starts_with($dataResponse, '250')) {
                throw new \RuntimeException("Failed to complete email transmission: {$dataResponse}");
            }

            // Cleanly close connection
            @fwrite($socket, "QUIT\r\n");
            @fclose($socket);

            return true;
        } catch (\Throwable $e) {
            self::$lastError = $e->getMessage();
            @fwrite($socket, "QUIT\r\n");
            @fclose($socket);
            return false;
        }
    }

    /**
     * Send a branded One-Time Password (OTP) email for PHINMA Education account verification.
     *
     * @param string $recipientEmail Institutional email (e.g. user@phinmaed.com)
     * @param string $otpCode 6-digit verification code
     * @param string $recipientName Optional full name
     * @return array Result array with status and metadata
     */
    public static function sendOtpEmail(string $recipientEmail, string $otpCode, string $recipientName = ''): array
    {
        $subject = "FixMyCampus OTP Verification Code: {$otpCode}";
        $salutation = !empty($recipientName) ? "Hello " . htmlspecialchars($recipientName) . "," : "Hello,";

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your FixMyCampus OTP</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; }
    .container { max-width: 560px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #93c5fd; }
    .badge { display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; }
    .content { padding: 36px 32px; }
    .otp-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; margin: 0; }
    .otp-hint { font-size: 12px; color: #64748b; margin-top: 8px; }
    .notice { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #1e40af; margin-top: 24px; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">PHINMA Education Security</div>
      <h1>FixMyCampus</h1>
      <p>Facility Defect &amp; Maintenance Reporting System</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">{$salutation}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        We received a request to verify your account or reset your password on FixMyCampus using this institutional email address (<strong>{$recipientEmail}</strong>).
      </p>
      <div class="otp-card">
        <p style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; margin: 0 0 8px 0;">Your Verification OTP</p>
        <div class="otp-code">{$otpCode}</div>
        <div class="otp-hint">Valid for 15 minutes • One-time use only</div>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #475569;">
        Enter this 6-digit code in the FixMyCampus application to complete your request.
      </p>
      <div class="notice">
        <strong>Security Notice:</strong> If you did not request this OTP code, please disregard this email or notify your campus IT administration immediately. Never share this code with anyone.
      </div>
    </div>
    <div class="footer">
      &copy; FixMyCampus &bull; PHINMA Education Physical Plant &amp; Facility Operations<br>
      This is an automated system message. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
HTML;

        $textBody = "FixMyCampus - PHINMA Education\n"
                  . "OTP Verification Code: {$otpCode}\n\n"
                  . "Hello,\n"
                  . "Your verification OTP is: {$otpCode}\n"
                  . "This code is valid for 15 minutes.\n\n"
                  . "If you did not request this code, please ignore this email.\n"
                  . "FixMyCampus - PHINMA Education Facilities Management";

        $success = self::send($recipientEmail, $subject, $htmlBody, $textBody);

        return [
            'success' => $success,
            'error'   => self::$lastError,
        ];
    }

    /**
     * Send an SMTP command and verify the expected status response code.
     */
    private static function sendCommand($socket, string $command, string $expectedCode): string
    {
        fwrite($socket, $command . "\r\n");
        $response = self::readResponse($socket);

        if (!str_starts_with($response, $expectedCode)) {
            throw new \RuntimeException("Command '{$command}' failed. Expected {$expectedCode}, received: {$response}");
        }

        return $response;
    }

    /**
     * Read multi-line response from the SMTP socket stream.
     */
    private static function readResponse($socket): string
    {
        $response = '';
        while (!feof($socket)) {
            $line = fgets($socket, 512);
            if ($line === false) {
                break;
            }
            $response .= $line;
            // Multiline responses have a hyphen after the 3-digit status code (e.g., '250-SIZE')
            // The final line has a space (e.g., '250 OK')
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return trim($response);
    }
}
