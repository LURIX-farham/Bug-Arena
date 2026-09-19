<?php
declare(strict_types=1);

use BugArena\Controllers\AchievementController;
use BugArena\Controllers\AnalyticsController;
use BugArena\Controllers\AuthController;
use BugArena\Controllers\CompetitiveController;
use BugArena\Controllers\ChallengeController;
use BugArena\Controllers\DuelController;
use BugArena\Controllers\EventController;
use BugArena\Controllers\HealthController;
use BugArena\Controllers\LeaderboardController;
use BugArena\Controllers\PlayerController;
use BugArena\Controllers\ReplayController;
use BugArena\Controllers\SubmissionController;
use BugArena\Controllers\SyncController;
use BugArena\Core\Router;
use BugArena\Middleware\RateLimitMiddleware;
use BugArena\Middleware\CsrfMiddleware;

return static function (Router $router): void {
    $auth = new AuthController();
    $player = new PlayerController();
    $submissions = new SubmissionController();
    $replays = new ReplayController();
    $competitive = new CompetitiveController();
    $achievements = new AchievementController();
    $leaderboard = new LeaderboardController();
    $analytics = new AnalyticsController();
    $events = new EventController();
    $health = new HealthController();
    $sync = new SyncController();
    $duel = new DuelController();

    $write = static function (callable $handler): callable {
        return static function ($req, $params = []) use ($handler): void {
            $csrfExempt = $req->method === 'POST'
                && in_array($req->path, ['/auth/register', '/auth/login'], true);
            if (!$csrfExempt) {
                CsrfMiddleware::verify();
            }
            $handler($req, $params);
        };
    };
    $challenges = new ChallengeController();

    // Light read protection for public/bulk endpoints (per IP).
    $readLimit = static fn (string $bucket, int $max, int $window, callable $next) => static fn ($req) => (new RateLimitMiddleware($max, $window))->handle($bucket . ':' . $req->ip) ?: $next($req);

    // Health (public)
    $router->get('/health', fn () => $health->show());
    $router->get('/', fn () => $health->show());

    // Auth
    $router->post('/auth/register', $write(fn ($req) => $auth->register($req)));
    $router->post('/auth/login', $write(fn ($req) => $auth->login($req)));
    $router->get('/auth/me', fn () => $auth->me());
    $router->post('/auth/logout', $write(fn () => $auth->logout()));

    // Public challenge catalog. Content is synchronized from MySQL.
    $router->get('/challenges', fn ($req) => $challenges->index($req));
    $router->get('/challenges/{id}', fn ($req, $p) => $challenges->show($req, $p));

    // Player (identity from session; PUT accepts profile whitelist)
    $router->get('/player', fn () => $player->show());
    $router->put('/player', $write(fn ($req) => $player->update($req)));

    // Submissions (server-scored)
    $router->get('/submissions', fn ($req) => $submissions->index($req));
    $router->post('/submissions', $write(fn ($req) => $submissions->store($req)));

    // Replays
    $router->get('/replays', fn ($req) => $replays->index($req));
    $router->post('/replays', $write(fn ($req) => $replays->store($req)));
    $router->post('/replays/{id}/events', $write(fn ($req, $p) => $replays->addEvents($req, $p)));
    $router->post('/replays/{id}/finish', $write(fn ($req, $p) => $replays->finish($req, $p)));

    // Competitive
    $router->get('/competitive/opponents', fn () => $competitive->opponents());
    $router->get('/competitive/matches', fn ($req) => $competitive->matches($req));
    $router->post('/competitive/matches', $write(fn ($req) => $competitive->matches($req)));

    // Duel (1v1 vs a live human — poll-based presence + invitations)
    $router->post('/duel/heartbeat', $write(fn ($req) => $duel->heartbeat()));
    $router->post('/duel/invitations', $write(fn ($req) => $duel->createInvite($req)));
    $router->get('/duel/invitations', fn ($req) => $duel->listInvites());
    $router->post('/duel/invitations/{id}/accept', $write(fn ($req, $p) => $duel->accept($req, $p)));
    $router->post('/duel/invitations/{id}/decline', $write(fn ($req, $p) => $duel->decline($req, $p)));
    $router->get('/duel/matches/{id}', fn ($req, $p) => $duel->show($req, $p));
    $router->post('/duel/matches/{id}/result', $write(fn ($req, $p) => $duel->result($req, $p)));
    $router->post('/duel/matches/{id}/cancel', $write(fn ($req, $p) => $duel->cancel($req, $p)));

    // Achievements (server-evaluated)
    $router->get('/achievements', fn () => $achievements->index());
    $router->post('/achievements/evaluate', $write(fn () => $achievements->evaluate()));

    // Leaderboard (public read)
    $router->get('/leaderboard', $readLimit('leaderboard', 120, 60, fn ($req) => $leaderboard->index($req)));

    // Analytics (server-computed)
    $router->get('/analytics', $readLimit('analytics', 60, 60, fn () => $analytics->dashboard()));

    // Activity events / sync sink
    $router->post('/events', $write(fn ($req) => $events->store($req)));

    // Offline sync batch (idempotent via sync_actions)
    $router->post('/sync', $write(fn ($req) => $sync->store($req)));
};
