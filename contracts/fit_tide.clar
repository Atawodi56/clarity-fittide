;; FitTide - Water Sports Fitness Tracker

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-activity (err u101))
(define-constant err-invalid-duration (err u102))
(define-constant err-invalid-distance (err u103))
(define-constant err-max-duration-exceeded (err u104))
(define-constant err-max-distance-exceeded (err u105))

;; Achievement Constants
(define-constant ACHIEVEMENT-MILESTONE-1 u10)
(define-constant MAX-DURATION u86400) ;; 24 hours in seconds
(define-constant MAX-DISTANCE u100000) ;; 100km in meters

;; Data Variables
(define-map user-stats
  { user: principal }
  {
    total-activities: uint,
    total-duration: uint,
    total-distance: uint,
    achievement-points: uint,
    achievements-earned: (list 10 uint)
  }
)

(define-map activities 
  { activity-id: uint, user: principal }
  {
    activity-type: (string-ascii 20),
    duration: uint,
    distance: uint,
    timestamp: uint
  }
)

;; Achievement NFTs
(define-non-fungible-token achievement-badge uint)

(define-data-var activity-counter uint u0)

;; Public Functions

(define-public (record-activity (activity-type (string-ascii 20)) (duration uint) (distance uint))
  (let
    (
      (activity-id (+ (var-get activity-counter) u1))
      (user-principal tx-sender)
    )
    (asserts! (is-valid-activity activity-type) err-invalid-activity)
    (asserts! (> duration u0) err-invalid-duration)
    (asserts! (>= distance u0) err-invalid-distance)
    (asserts! (<= duration MAX-DURATION) err-max-duration-exceeded)
    (asserts! (<= distance MAX-DISTANCE) err-max-distance-exceeded)
    
    ;; Update activity counter
    (var-set activity-counter activity-id)
    
    ;; Record the activity
    (map-set activities
      { activity-id: activity-id, user: user-principal }
      {
        activity-type: activity-type,
        duration: duration,
        distance: distance,
        timestamp: block-height
      }
    )
    
    ;; Update user stats
    (update-user-stats user-principal duration distance)
    
    ;; Check and award achievements
    (try! (check-achievements user-principal))
    
    (ok activity-id)
  )
)

;; Private Functions

(define-private (is-valid-activity (activity-type (string-ascii 20)))
  (or
    (is-eq activity-type "kayaking")
    (is-eq activity-type "surfing")
    (is-eq activity-type "swimming")
  )
)

(define-private (update-user-stats (user principal) (duration uint) (distance uint))
  (let
    (
      (current-stats (default-to
        { 
          total-activities: u0, 
          total-duration: u0, 
          total-distance: u0, 
          achievement-points: u0,
          achievements-earned: (list)
        }
        (map-get? user-stats { user: user })))
    )
    (map-set user-stats
      { user: user }
      {
        total-activities: (+ (get total-activities current-stats) u1),
        total-duration: (+ (get total-duration current-stats) duration),
        total-distance: (+ (get total-distance current-stats) distance),
        achievement-points: (get achievement-points current-stats),
        achievements-earned: (get achievements-earned current-stats)
      }
    )
  )
)

(define-private (check-achievements (user principal))
  (let
    (
      (stats (unwrap! (map-get? user-stats { user: user }) (err u0)))
    )
    ;; Award achievements based on milestones
    (if (and
      (>= (get total-activities stats) ACHIEVEMENT-MILESTONE-1)
      (is-none (nft-get-owner? achievement-badge u1))
      (is-none (index-of (get achievements-earned stats) u1)))
      (begin
        (try! (nft-mint? achievement-badge u1 user))
        (map-set user-stats
          { user: user }
          (merge stats {
            achievement-points: (+ (get achievement-points stats) u1),
            achievements-earned: (unwrap! (as-max-len? (append (get achievements-earned stats) u1) u10) (err u0))
          })
        )
        (ok true)
      )
      (ok true)
    )
  )
)

;; Read Only Functions

(define-read-only (get-user-stats (user principal))
  (ok (map-get? user-stats { user: user }))
)

(define-read-only (get-activity (activity-id uint) (user principal))
  (ok (map-get? activities { activity-id: activity-id, user: user }))
)
